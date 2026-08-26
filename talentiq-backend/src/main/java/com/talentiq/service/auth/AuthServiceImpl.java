package com.talentiq.service.auth;

import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.exception.UnauthorizedException;
import com.talentiq.config.AppProperties;
import com.talentiq.dto.auth.*;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.model.*;
import com.talentiq.model.auth.*;
import com.talentiq.repository.auth.*;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.security.jwt.JwtService;
import com.talentiq.security.userdetails.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Authentication service implementation with completely isolated role storage.
 * Candidate profiles and credentials live in users & user_credentials.
 * HR profiles and credentials live strictly in hr_profiles & hr_credentials (zero rows in users table).
 * Company Admin credentials live in company_credentials.
 * App Developer credentials live in app_dev_credentials.
 * Management Team credentials live in management_team_credentials.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final int MAX_LOGIN_ATTEMPTS = 4;
    private static final int LOCKOUT_MINUTES = 30;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CandidateRepository candidateRepository;
    private final CompanyRepository companyRepository;
    private final HrProfileRepository hrProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final AppProperties appProperties;
    private final com.talentiq.security.jwt.TokenBlacklistService tokenBlacklistService;
    private final RedisOtpService redisOtpService;
    private final com.talentiq.security.email.EmailSecurityValidator emailSecurityValidator;

    // Dedicated credential repositories
    private final UserCredentialRepository userCredentialRepository;
    private final HrCredentialRepository hrCredentialRepository;
    private final CompanyCredentialRepository companyCredentialRepository;
    private final AppDevCredentialRepository appDevCredentialRepository;
    private final ManagementTeamCredentialRepository managementTeamCredentialRepository;

    // ── Email Validation & Security Guard ──────────────────────────────────────
    private void validateEmailFormat(String email, Role role) {
        emailSecurityValidator.validateEmailSecurity(email, role);
    }

    private boolean isEmailAlreadyRegistered(String email) {
        return userRepository.existsByEmail(email)
                || hrProfileRepository.existsByEmail(email)
                || userCredentialRepository.existsByEmail(email)
                || hrCredentialRepository.existsByEmail(email)
                || companyCredentialRepository.existsByEmail(email)
                || appDevCredentialRepository.existsByEmail(email)
                || managementTeamCredentialRepository.existsByEmail(email);
    }

    // ── Registration OTP Flow ──────────────────────────────────────────────────

    @Override
    public void sendRegistrationOtp(SendRegistrationOtpRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, request.getRole());

        if (isEmailAlreadyRegistered(email)) {
            throw new ConflictException("An account with this email address already exists.");
        }

        // 1. Enforce Redis sliding-window rate limit
        String ipAddress = getClientIpAddress(httpRequest);
        redisOtpService.enforceRateLimit(email, ipAddress);

        // 2. Generate cryptographically random 4-digit code
        int randomPin = new java.security.SecureRandom().nextInt(10000);
        String otp = String.format("%04d", randomPin);

        // 3. Store in Redis with 10-minute automated TTL — bound to the requested role
        redisOtpService.storeRegistrationOtp(email, otp, 10, request.getRole().name());

        // 4. Send email asynchronously via non-blocking worker thread
        String firstName = StringUtils.hasText(request.getFirstName()) ? request.getFirstName().trim() : "User";
        mailService.sendRegistrationOtpEmail(email, firstName, otp);

        log.info("Registration OTP generated and dispatched to: {} [role: {}]", email, request.getRole());
    }

    @Override
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, request.getRole());

        // 1. Validate role
        if (request.getRole() == null) {
            throw new BadRequestException("Role is required for registration");
        }

        // 2. Mandatory Email OTP Verification with Role Binding
        if (!StringUtils.hasText(request.getOtp())) {
            throw new BadRequestException("4-digit email verification code is required.");
        }
        redisOtpService.verifyRegistrationOtpWithRole(email, request.getOtp(), request.getRole().name());

        // 3. Email uniqueness check
        if (isEmailAlreadyRegistered(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        String passwordHash = passwordEncoder.encode(request.getPassword());
        String firstName = request.getFirstName() != null ? request.getFirstName().trim() : "HR";
        String lastName = request.getLastName() != null ? request.getLastName().trim() : "";
        String phone = request.getPhone();

        // ── SPECIAL CASE: HR RECRUITER (Zero rows in users table!) ────────────
        if (request.getRole().equals(Role.ROLE_HR)) {
            String companyName = StringUtils.hasText(request.getCompanyName()) ? request.getCompanyName().trim() : "Company (" + firstName + ")";
            String slug = companyName.toLowerCase().replaceAll("[^a-z0-9]", "-") + "-" + System.currentTimeMillis();
            Company company = companyRepository.findByName(companyName).orElseGet(() ->
                    companyRepository.save(Company.builder()
                            .name(companyName)
                            .slug(slug)
                            .website(request.getCompanyWebsite())
                            .industry(request.getIndustry())
                            .companySize(request.getCompanySize())
                            .verified(true)
                            .active(true)
                            .build())
            );

            HrProfile hrProfile = HrProfile.builder()
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .phone(phone)
                    .company(company)
                    .designation(StringUtils.hasText(request.getJobTitle()) ? request.getJobTitle() : "HR Recruiter")
                    .department(request.getDepartment())
                    .companyAdmin(false)
                    .companyVerified(true)
                    .companyVerifiedAt(Instant.now())
                    .companyVerifiedTitle("Verified Talent Partner")
                    .active(true)
                    .build();
            HrProfile savedHrProfile = hrProfileRepository.save(hrProfile);

            HrCredential credential = HrCredential.builder()
                    .hrProfile(savedHrProfile)
                    .email(email)
                    .passwordHash(passwordHash)
                    .role(Role.ROLE_HR)
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            HrCredential savedCred = hrCredentialRepository.save(credential);

            log.info("New HR Recruiter registered strictly in hr_profiles and hr_credentials: {}", email);

            // Dispatch Welcome email with role HR Recruiter
            mailService.sendAccountCreatedEmail(email, firstName, "ROLE_HR");

            UserPrincipal principal = new UserPrincipal(savedHrProfile, savedCred);
            String accessToken = jwtService.generateAccessToken(principal, savedHrProfile.getId());
            RefreshToken refreshToken = createRefreshToken(null, email, httpRequest);

            return buildAuthResponse(savedHrProfile, accessToken, refreshToken.getToken());
        }

        // ── OTHER ROLES (Candidate / Admins) ──────────────────────────────────
        User user = User.builder()
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .phone(phone)
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .build();

        user.addRole(request.getRole());
        User savedUser = userRepository.save(user);
        UserPrincipal principal;

        if (request.getRole().equals(Role.ROLE_CANDIDATE)) {
            UserCredential credential = UserCredential.builder()
                    .user(savedUser)
                    .email(email)
                    .passwordHash(passwordHash)
                    .role(request.getRole())
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            userCredentialRepository.save(credential);

            Candidate candidate = Candidate.builder()
                    .user(savedUser)
                    .location(request.getLocation())
                    .currentTitle(request.getDesiredRole())
                    .yearsExperience(request.getYearsExperience() != null ? request.getYearsExperience() : 0)
                    .openToWork(true)
                    .build();
            candidateRepository.save(candidate);
            principal = new UserPrincipal(savedUser, credential);

        } else if (request.getRole().equals(Role.ROLE_COMPANY_ADMIN)) {
            String companyName = StringUtils.hasText(request.getCompanyName()) ? request.getCompanyName().trim() : "Company (" + savedUser.getFirstName() + ")";
            String baseSlug = companyName.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
            if (baseSlug.isEmpty()) baseSlug = "company";
            String slug = baseSlug;
            int counter = 2;
            while (companyRepository.existsBySlug(slug)) {
                slug = baseSlug + "-" + counter++;
            }
            final String finalSlug = slug;
            Company company = companyRepository.findByName(companyName).orElseGet(() ->
                    companyRepository.save(Company.builder()
                            .name(companyName)
                            .slug(finalSlug)
                            .website(request.getCompanyWebsite())
                            .industry(request.getIndustry())
                            .companySize(request.getCompanySize())
                            .verified(true)
                            .active(true)
                            .build())
            );
            HrProfile hrProfile = HrProfile.builder()
                    .user(savedUser)
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .phone(phone)
                    .company(company)
                    .designation(StringUtils.hasText(request.getJobTitle()) ? request.getJobTitle() : "Company Director / CEO")
                    .companyAdmin(true)
                    .companyVerified(true)
                    .companyVerifiedAt(Instant.now())
                    .companyVerifiedTitle("Verified Company Executive")
                    .build();
            hrProfileRepository.save(hrProfile);

            CompanyCredential credential = CompanyCredential.builder()
                    .user(savedUser)
                    .email(email)
                    .passwordHash(passwordHash)
                    .role(Role.ROLE_COMPANY_ADMIN)
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            CompanyCredential savedCred = companyCredentialRepository.save(credential);
            principal = new UserPrincipal(savedUser, savedCred);

        } else if (request.getRole().equals(Role.ROLE_APP_DEVELOPER)) {
            AppDevCredential credential = AppDevCredential.builder()
                    .user(savedUser)
                    .email(email)
                    .passwordHash(passwordHash)
                    .role(Role.ROLE_APP_DEVELOPER)
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            AppDevCredential savedCred = appDevCredentialRepository.save(credential);
            principal = new UserPrincipal(savedUser, savedCred);

        } else if (request.getRole().equals(Role.ROLE_MANAGEMENT_TEAM)) {
            ManagementTeamCredential credential = ManagementTeamCredential.builder()
                    .user(savedUser)
                    .email(email)
                    .passwordHash(passwordHash)
                    .role(Role.ROLE_MANAGEMENT_TEAM)
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            ManagementTeamCredential savedCred = managementTeamCredentialRepository.save(credential);
            principal = new UserPrincipal(savedUser, savedCred);

        } else {
            UserCredential credential = UserCredential.builder()
                    .user(savedUser)
                    .email(email)
                    .passwordHash(passwordHash)
                    .role(request.getRole())
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            userCredentialRepository.save(credential);
            principal = new UserPrincipal(savedUser, credential);
        }

        log.info("New user registered and stored in dedicated credential table: {} [{}]", savedUser.getEmail(), request.getRole());

        // Dispatch Welcome / Account Created email
        mailService.sendAccountCreatedEmail(savedUser.getEmail(), savedUser.getFirstName(), request.getRole().name());

        // Issue tokens for instant authentication upon registration
        String accessToken = jwtService.generateAccessToken(principal, savedUser.getId());
        RefreshToken refreshToken = createRefreshToken(savedUser, email, httpRequest);

        return buildAuthResponse(savedUser, accessToken, refreshToken.getToken());
    }

    @Override
    public AuthResponse registerCandidate(RegisterRequest request, HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_CANDIDATE);
        return register(request, httpRequest);
    }

    @Override
    public AuthResponse registerHr(RegisterRequest request, HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_HR);
        return register(request, httpRequest);
    }

    @Override
    public AuthResponse registerCompany(RegisterRequest request, HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_COMPANY_ADMIN);
        return register(request, httpRequest);
    }

    @Override
    public AuthResponse registerAppDeveloper(RegisterRequest request, HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_APP_DEVELOPER);
        return register(request, httpRequest);
    }

    @Override
    public AuthResponse registerManagementTeam(RegisterRequest request, HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_MANAGEMENT_TEAM);
        return register(request, httpRequest);
    }

    // ── Dedicated Login Implementation using Role Credential Tables ───────────

    @Override
    public AuthResponse loginCandidate(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, Role.ROLE_CANDIDATE);

        UserCredential cred = userCredentialRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        checkCredentialLockout(cred.isLocked(), cred.getLockedUntil());

        if (cred.getRole() != Role.ROLE_CANDIDATE && (cred.getUser() == null || !cred.getUser().hasRole(Role.ROLE_CANDIDATE))) {
            throw new BadCredentialsException("Account is not authorized for Candidate portal.");
        }

        if (!passwordEncoder.matches(request.getPassword(), cred.getPasswordHash())) {
            throw handleFailedCandidateLogin(cred);
        }

        userCredentialRepository.recordSuccessfulLogin(cred.getId(), Instant.now());

        User user = cred.getUser();
        if (user != null && !candidateRepository.existsByUserId(user.getId())) {
            candidateRepository.save(Candidate.builder().user(user).openToWork(true).build());
        }

        UserPrincipal principal = new UserPrincipal(user, cred);
        String accessToken = jwtService.generateAccessToken(principal, user != null ? user.getId() : 1L);
        RefreshToken refreshToken = createRefreshToken(user, email, httpRequest);

        log.info("Candidate logged in successfully: {}", email);
        return buildAuthResponse(user, accessToken, refreshToken.getToken());
    }

    @Override
    public AuthResponse loginHr(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, Role.ROLE_HR);

        HrCredential cred = hrCredentialRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        checkCredentialLockout(cred.isLocked(), cred.getLockedUntil());

        if (cred.getRole() != Role.ROLE_HR) {
            throw new BadCredentialsException("Account is not authorized for HR Recruiter portal.");
        }

        if (!passwordEncoder.matches(request.getPassword(), cred.getPasswordHash())) {
            throw handleFailedHrLogin(cred);
        }

        hrCredentialRepository.recordSuccessfulLogin(cred.getId(), Instant.now());

        HrProfile hrProfile = hrProfileRepository.findByEmail(email).orElseGet(() -> {
            Company defaultComp = companyRepository.findByName("TalentIQ Enterprise")
                    .orElseGet(() -> companyRepository.save(Company.builder()
                            .name("TalentIQ Enterprise")
                            .slug("talentiq-enterprise-" + System.currentTimeMillis())
                            .verified(true)
                            .active(true)
                            .build()));
            return hrProfileRepository.save(HrProfile.builder()
                    .email(email)
                    .firstName("HR")
                    .lastName("Recruiter")
                    .company(defaultComp)
                    .designation("Talent Partner")
                    .companyAdmin(false)
                    .active(true)
                    .build());
        });

        UserPrincipal principal = new UserPrincipal(hrProfile, cred);
        String accessToken = jwtService.generateAccessToken(principal, hrProfile.getId());
        RefreshToken refreshToken = createRefreshToken(null, email, httpRequest);

        log.info("HR Recruiter logged in successfully strictly from hr_profiles/hr_credentials: {}", email);
        return buildAuthResponse(hrProfile, accessToken, refreshToken.getToken());
    }

    @Override
    public AuthResponse loginCompany(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, Role.ROLE_COMPANY_ADMIN);

        CompanyCredential cred = companyCredentialRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        checkCredentialLockout(cred.isLocked(), cred.getLockedUntil());

        if (cred.getRole() != Role.ROLE_COMPANY_ADMIN && (cred.getUser() == null || !cred.getUser().hasRole(Role.ROLE_COMPANY_ADMIN))) {
            throw new BadCredentialsException("Account is not authorized for Company Director portal.");
        }

        if (!passwordEncoder.matches(request.getPassword(), cred.getPasswordHash())) {
            throw handleFailedCompanyLogin(cred);
        }

        return initiateAdmin2FaFlow(cred.getUser(), Role.ROLE_COMPANY_ADMIN, httpRequest);
    }

    @Override
    public AuthResponse loginAppDeveloper(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, Role.ROLE_APP_DEVELOPER);

        AppDevCredential cred = appDevCredentialRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        checkCredentialLockout(cred.isLocked(), cred.getLockedUntil());

        if (cred.getRole() != Role.ROLE_APP_DEVELOPER && (cred.getUser() == null || !cred.getUser().hasRole(Role.ROLE_APP_DEVELOPER))) {
            throw new BadCredentialsException("Account is not authorized for Developer portal.");
        }

        if (!passwordEncoder.matches(request.getPassword(), cred.getPasswordHash())) {
            throw handleFailedAppDevLogin(cred);
        }

        return initiateAdmin2FaFlow(cred.getUser(), Role.ROLE_APP_DEVELOPER, httpRequest);
    }

    @Override
    public AuthResponse loginManagementTeam(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, Role.ROLE_MANAGEMENT_TEAM);

        ManagementTeamCredential cred = managementTeamCredentialRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        checkCredentialLockout(cred.isLocked(), cred.getLockedUntil());

        if (cred.getRole() != Role.ROLE_MANAGEMENT_TEAM && (cred.getUser() == null || !cred.getUser().hasRole(Role.ROLE_MANAGEMENT_TEAM))) {
            throw new BadCredentialsException("Account is not authorized for Management portal.");
        }

        if (!passwordEncoder.matches(request.getPassword(), cred.getPasswordHash())) {
            throw handleFailedManagementLogin(cred);
        }

        return initiateAdmin2FaFlow(cred.getUser(), Role.ROLE_MANAGEMENT_TEAM, httpRequest);
    }

    @Override
    public AuthResponse loginAdmin(LoginRequest request, HttpServletRequest httpRequest) {
        if (request.getRequiredRole() != null) {
            if (request.getRequiredRole() == Role.ROLE_COMPANY_ADMIN) {
                return loginCompany(request, httpRequest);
            } else if (request.getRequiredRole() == Role.ROLE_APP_DEVELOPER) {
                return loginAppDeveloper(request, httpRequest);
            } else if (request.getRequiredRole() == Role.ROLE_MANAGEMENT_TEAM) {
                return loginManagementTeam(request, httpRequest);
            }
        }
        return login(request, httpRequest);
    }

    private AuthResponse initiateAdmin2FaFlow(User user, Role role, HttpServletRequest httpRequest) {
        String email = user.getEmail();

        int randomPin = new java.security.SecureRandom().nextInt(10000);
        String otp = String.format("%04d", randomPin);
        String twoFactorToken = "2fa_sess_" + UUID.randomUUID().toString().replace("-", "");

        redisOtpService.store2FaSession(email, twoFactorToken, otp, 5);
        mailService.sendAdmin2FaOtpEmail(email, user.getFirstName(), role.name(), otp);

        log.info("🔐 [ADMIN 2FA SECURITY CODE DISPATCHED FOR {} ({})]", email, role);

        return AuthResponse.builder()
                .requires2Fa(true)
                .twoFactorToken(twoFactorToken)
                .twoFactorMethod("EMAIL_OTP")
                .email(email)
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles())
                .build();
    }

    @Override
    public AuthResponse verify2FaAdmin(TwoFactorVerifyRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        redisOtpService.verify2FaSession(email, request.getTwoFactorToken(), request.getOtp());
        redisOtpService.consume2FaSession(email, request.getTwoFactorToken());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));

        Optional<CompanyCredential> compOpt = companyCredentialRepository.findByEmail(email);
        if (compOpt.isPresent()) {
            companyCredentialRepository.recordSuccessfulLogin(compOpt.get().getId(), Instant.now());
            UserPrincipal principal = new UserPrincipal(user, compOpt.get());
            String accessToken = jwtService.generateAccessToken(principal, user.getId());
            RefreshToken refreshToken = createRefreshToken(user, email, httpRequest);
            return buildAuthResponse(user, accessToken, refreshToken.getToken());
        }

        Optional<AppDevCredential> devOpt = appDevCredentialRepository.findByEmail(email);
        if (devOpt.isPresent()) {
            appDevCredentialRepository.recordSuccessfulLogin(devOpt.get().getId(), Instant.now());
            UserPrincipal principal = new UserPrincipal(user, devOpt.get());
            String accessToken = jwtService.generateAccessToken(principal, user.getId());
            RefreshToken refreshToken = createRefreshToken(user, email, httpRequest);
            return buildAuthResponse(user, accessToken, refreshToken.getToken());
        }

        Optional<ManagementTeamCredential> mgmtOpt = managementTeamCredentialRepository.findByEmail(email);
        if (mgmtOpt.isPresent()) {
            managementTeamCredentialRepository.recordSuccessfulLogin(mgmtOpt.get().getId(), Instant.now());
            UserPrincipal principal = new UserPrincipal(user, mgmtOpt.get());
            String accessToken = jwtService.generateAccessToken(principal, user.getId());
            RefreshToken refreshToken = createRefreshToken(user, email, httpRequest);
            return buildAuthResponse(user, accessToken, refreshToken.getToken());
        }

        UserPrincipal principal = new UserPrincipal(user);
        String accessToken = jwtService.generateAccessToken(principal, user.getId());
        RefreshToken refreshToken = createRefreshToken(user, email, httpRequest);

        log.info("Admin 2FA verification successful for: {}", email);
        return buildAuthResponse(user, accessToken, refreshToken.getToken());
    }

    @Override
    public void resend2FaOtp(TwoFactorResendRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));

        Role primaryRole = user.getRoles().isEmpty() ? Role.ROLE_COMPANY_ADMIN : user.getRoles().iterator().next();

        int randomPin = new java.security.SecureRandom().nextInt(10000);
        String newOtp = String.format("%04d", randomPin);

        redisOtpService.store2FaSession(email, request.getTwoFactorToken(), newOtp, 5);
        mailService.sendAdmin2FaOtpEmail(email, user.getFirstName(), primaryRole.name(), newOtp);
        log.info("Admin 2FA OTP re-dispatched to: {} [Session: {}]", email, request.getTwoFactorToken());
    }

    @Override
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, request.getRequiredRole());

        // 1. Try HR credentials
        Optional<HrCredential> hrCredOpt = hrCredentialRepository.findByEmail(email);
        if (hrCredOpt.isPresent()) {
            return loginHr(request, httpRequest);
        }

        // 2. Try User / Candidate credentials
        Optional<UserCredential> userCredOpt = userCredentialRepository.findByEmail(email);
        if (userCredOpt.isPresent()) {
            return loginCandidate(request, httpRequest);
        }

        // 3. Try Company Admin credentials
        Optional<CompanyCredential> compCredOpt = companyCredentialRepository.findByEmail(email);
        if (compCredOpt.isPresent()) {
            return loginCompany(request, httpRequest);
        }

        // 4. Try App Developer credentials
        Optional<AppDevCredential> devCredOpt = appDevCredentialRepository.findByEmail(email);
        if (devCredOpt.isPresent()) {
            return loginAppDeveloper(request, httpRequest);
        }

        // 5. Try Management Team credentials
        Optional<ManagementTeamCredential> mgmtCredOpt = managementTeamCredentialRepository.findByEmail(email);
        if (mgmtCredOpt.isPresent()) {
            return loginManagementTeam(request, httpRequest);
        }

        throw new BadCredentialsException("Invalid email or password");
    }

    // ── Google OAuth Login / Registration ─────────────────────────────────────

    @Override
    public AuthResponse googleLogin(GoogleAuthRequest request, HttpServletRequest httpRequest) {
        throw new BadRequestException("Google OAuth is temporarily disabled for security hardening. Please use standard email/password authentication.");
    }

    // ── Token Refresh ─────────────────────────────────────────────────────────

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request, HttpServletRequest httpRequest) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (refreshToken.isRevoked()) {
            if (refreshToken.getUser() != null) {
                refreshTokenRepository.revokeAllUserTokens(refreshToken.getUser().getId());
            } else if (refreshToken.getUserEmail() != null) {
                refreshTokenRepository.revokeAllTokensByEmail(refreshToken.getUserEmail());
            }
            throw new UnauthorizedException("Refresh token was revoked. Please log in again.");
        }

        if (refreshToken.isExpired()) {
            throw new UnauthorizedException("Refresh token expired. Please log in again.");
        }

        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        if (refreshToken.getUser() != null) {
            User user = refreshToken.getUser();
            UserCredential cred = userCredentialRepository.findByUserId(user.getId()).orElse(null);
            UserPrincipal principal = new UserPrincipal(user, cred);
            String newAccessToken = jwtService.generateAccessToken(principal, user.getId());
            RefreshToken newRefreshToken = createRefreshToken(user, user.getEmail(), httpRequest);
            return buildAuthResponse(user, newAccessToken, newRefreshToken.getToken());
        } else if (refreshToken.getUserEmail() != null) {
            String email = refreshToken.getUserEmail();
            Optional<HrProfile> hrProfileOpt = hrProfileRepository.findByEmail(email);
            if (hrProfileOpt.isPresent()) {
                HrProfile profile = hrProfileOpt.get();
                Optional<HrCredential> credOpt = hrCredentialRepository.findByEmail(email);
                UserPrincipal principal = new UserPrincipal(profile, credOpt.orElse(null));
                String newAccessToken = jwtService.generateAccessToken(principal, profile.getId());
                RefreshToken newRefreshToken = createRefreshToken(null, email, httpRequest);
                return buildAuthResponse(profile, newAccessToken, newRefreshToken.getToken());
            }
        }

        throw new UnauthorizedException("Invalid user session");
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @Override
    public void logout(Long userId, String accessToken) {
        if (StringUtils.hasText(accessToken)) {
            tokenBlacklistService.blacklistToken(accessToken, appProperties.getJwt().getAccessTokenExpiryMs());
            try {
                String email = jwtService.extractSubject(accessToken);
                if (StringUtils.hasText(email)) {
                    refreshTokenRepository.revokeAllTokensByEmail(email.toLowerCase().trim());
                }
            } catch (Exception e) {
                log.debug("Could not extract email from token during logout: {}", e.getMessage());
            }
        }
        if (userId != null) {
            logout(userId);
        }
    }

    @Override
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllUserTokens(userId);
        log.info("User {} logged out, all refresh tokens revoked", userId);
    }

    // ── Email Verification ────────────────────────────────────────────────────

    @Override
    public void verifyEmail(VerifyEmailRequest request) {
        String token = request.getToken() != null ? request.getToken().trim() : "";
        String verifiedEmail = redisOtpService.consumeEmailVerificationToken(token);

        Optional<User> userOpt = userRepository.findByEmail(verifiedEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            userRepository.verifyEmail(user.getId());
            userCredentialRepository.findByUserId(user.getId()).ifPresent(c -> {
                c.setEmailVerified(true);
                c.setStatus(UserStatus.ACTIVE);
                userCredentialRepository.save(c);
            });
        }

        hrCredentialRepository.findByEmail(verifiedEmail).ifPresent(c -> {
            c.setEmailVerified(true);
            c.setStatus(UserStatus.ACTIVE);
            hrCredentialRepository.save(c);
        });

        log.info("Email verified successfully for user: {}", verifiedEmail);
    }

    @Override
    public void resendVerificationEmail(String email) {
        String cleanEmail = email.toLowerCase().trim();
        String firstName = "User";

        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.isEmailVerified()) {
                throw new BadRequestException("Email is already verified");
            }
            firstName = user.getFirstName();
        } else {
            Optional<HrProfile> hrOpt = hrProfileRepository.findByEmail(cleanEmail);
            if (hrOpt.isPresent()) {
                HrProfile hr = hrOpt.get();
                firstName = hr.getFirstName();
            } else {
                throw new ResourceNotFoundException("User", "email", email);
            }
        }

        String verificationToken = UUID.randomUUID().toString();
        redisOtpService.storeEmailVerificationToken(verificationToken, cleanEmail, 24);
        mailService.sendEmailVerification(cleanEmail, firstName, verificationToken);
        log.info("Email verification token generated and dispatched for: {}", cleanEmail);
    }

    // ── Password Reset with 4-Digit OTP ───────────────────────────────────────

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email, null);

        redisOtpService.enforceRateLimit(email, null);

        String firstName = "User";
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            firstName = userOpt.get().getFirstName();
        } else {
            Optional<HrProfile> hrOpt = hrProfileRepository.findByEmail(email);
            if (hrOpt.isPresent()) {
                firstName = hrOpt.get().getFirstName();
            } else {
                throw new BadRequestException("No registered account found with email: " + email);
            }
        }

        int randomPin = new java.security.SecureRandom().nextInt(10000);
        String otp = String.format("%04d", randomPin);
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        redisOtpService.storeOtp(email, otp, 10);

        userCredentialRepository.findByEmail(email)
                .ifPresent(c -> userCredentialRepository.savePasswordResetOtp(c.getId(), otp, expiresAt));
        hrCredentialRepository.findByEmail(email)
                .ifPresent(c -> hrCredentialRepository.savePasswordResetOtp(c.getId(), otp, expiresAt));
        companyCredentialRepository.findByEmail(email)
                .ifPresent(c -> companyCredentialRepository.savePasswordResetOtp(c.getId(), otp, expiresAt));
        appDevCredentialRepository.findByEmail(email)
                .ifPresent(c -> appDevCredentialRepository.savePasswordResetOtp(c.getId(), otp, expiresAt));
        managementTeamCredentialRepository.findByEmail(email)
                .ifPresent(c -> managementTeamCredentialRepository.savePasswordResetOtp(c.getId(), otp, expiresAt));

        mailService.sendPasswordResetOtpEmail(email, firstName, otp);
        log.info("🔑 [HIREMIND AI - 4-DIGIT OTP DISPATCHED FOR {}]", email);
    }

    @Override
    public void verifyPasswordResetOtp(VerifyOtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        redisOtpService.verifyOtp(email, request.getOtp());
        log.info("4-Digit OTP verified successfully in Redis for email: {}", email);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : null;
        if (!StringUtils.hasText(email)) {
            throw new BadRequestException("Email is required for password reset.");
        }

        String providedOtpOrToken = StringUtils.hasText(request.getOtp()) ? request.getOtp().trim() : request.getToken();
        boolean verified = redisOtpService.isOtpVerified(email);

        if (!verified && StringUtils.hasText(providedOtpOrToken)) {
            // Verify and consume OTP with Redis brute-force protection (5 attempts / 15 min lock)
            redisOtpService.verifyOtp(email, providedOtpOrToken);
            verified = true;
        }

        if (!verified) {
            throw new BadRequestException("Invalid or expired 4-digit OTP. Please request a new code.");
        }

        String newHash = passwordEncoder.encode(request.getNewPassword());
        userCredentialRepository.findByEmail(email).ifPresent(c -> userCredentialRepository.updatePassword(c.getId(), newHash));
        hrCredentialRepository.findByEmail(email).ifPresent(c -> hrCredentialRepository.updatePassword(c.getId(), newHash));
        companyCredentialRepository.findByEmail(email).ifPresent(c -> companyCredentialRepository.updatePassword(c.getId(), newHash));
        appDevCredentialRepository.findByEmail(email).ifPresent(c -> appDevCredentialRepository.updatePassword(c.getId(), newHash));
        managementTeamCredentialRepository.findByEmail(email).ifPresent(c -> managementTeamCredentialRepository.updatePassword(c.getId(), newHash));

        redisOtpService.consumeVerifiedTicket(email);
        userRepository.findByEmail(email).ifPresent(u -> refreshTokenRepository.revokeAllUserTokens(u.getId()));
        refreshTokenRepository.revokeAllTokensByEmail(email);

        log.info("Password reset successfully updated in credentials table for: {}", email);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private void checkCredentialLockout(boolean isLocked, Instant lockedUntil) {
        if (isLocked && lockedUntil != null) {
            long remainingMinutes = ChronoUnit.MINUTES.between(Instant.now(), lockedUntil) + 1;
            if (remainingMinutes < 1) remainingMinutes = 1;
            throw new UnauthorizedException(
                    String.format("Account is temporarily locked due to %d consecutive failed password attempts. Please try again after %d minute%s or reset your password.",
                            MAX_LOGIN_ATTEMPTS, remainingMinutes, remainingMinutes == 1 ? "" : "s"));
        }
    }

    private RuntimeException handleFailedCandidateLogin(UserCredential cred) {
        int attempts = cred.getLoginAttempts() + 1;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            userCredentialRepository.lockAccount(cred.getId(), Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            return new UnauthorizedException(String.format("Account is temporarily locked for %d minutes due to %d consecutive failed password attempts.", LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS));
        } else {
            userCredentialRepository.incrementLoginAttempts(cred.getId());
            int remaining = MAX_LOGIN_ATTEMPTS - attempts;
            return new BadCredentialsException(String.format("Invalid password. %d attempt%s remaining before account is temporarily locked.", remaining, remaining == 1 ? "" : "s"));
        }
    }

    private RuntimeException handleFailedHrLogin(HrCredential cred) {
        int attempts = cred.getLoginAttempts() + 1;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            hrCredentialRepository.lockAccount(cred.getId(), Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            return new UnauthorizedException(String.format("Account is temporarily locked for %d minutes due to %d consecutive failed password attempts.", LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS));
        } else {
            hrCredentialRepository.incrementLoginAttempts(cred.getId());
            int remaining = MAX_LOGIN_ATTEMPTS - attempts;
            return new BadCredentialsException(String.format("Invalid password. %d attempt%s remaining before account is temporarily locked.", remaining, remaining == 1 ? "" : "s"));
        }
    }

    private RuntimeException handleFailedCompanyLogin(CompanyCredential cred) {
        int attempts = cred.getLoginAttempts() + 1;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            companyCredentialRepository.lockAccount(cred.getId(), Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            return new UnauthorizedException(String.format("Account is temporarily locked for %d minutes due to %d consecutive failed password attempts.", LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS));
        } else {
            companyCredentialRepository.incrementLoginAttempts(cred.getId());
            int remaining = MAX_LOGIN_ATTEMPTS - attempts;
            return new BadCredentialsException(String.format("Invalid password. %d attempt%s remaining before account is temporarily locked.", remaining, remaining == 1 ? "" : "s"));
        }
    }

    private RuntimeException handleFailedAppDevLogin(AppDevCredential cred) {
        int attempts = cred.getLoginAttempts() + 1;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            appDevCredentialRepository.lockAccount(cred.getId(), Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            return new UnauthorizedException(String.format("Account is temporarily locked for %d minutes due to %d consecutive failed password attempts.", LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS));
        } else {
            appDevCredentialRepository.incrementLoginAttempts(cred.getId());
            int remaining = MAX_LOGIN_ATTEMPTS - attempts;
            return new BadCredentialsException(String.format("Invalid password. %d attempt%s remaining before account is temporarily locked.", remaining, remaining == 1 ? "" : "s"));
        }
    }

    private RuntimeException handleFailedManagementLogin(ManagementTeamCredential cred) {
        int attempts = cred.getLoginAttempts() + 1;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            managementTeamCredentialRepository.lockAccount(cred.getId(), Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            return new UnauthorizedException(String.format("Account is temporarily locked for %d minutes due to %d consecutive failed password attempts.", LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS));
        } else {
            managementTeamCredentialRepository.incrementLoginAttempts(cred.getId());
            int remaining = MAX_LOGIN_ATTEMPTS - attempts;
            return new BadCredentialsException(String.format("Invalid password. %d attempt%s remaining before account is temporarily locked.", remaining, remaining == 1 ? "" : "s"));
        }
    }

    private RefreshToken createRefreshToken(User user, String email, HttpServletRequest httpRequest) {
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .userEmail(email)
                .token(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plus(appProperties.getJwt().getRefreshTokenExpiryDays(), ChronoUnit.DAYS))
                .userAgent(getClientUserAgent(httpRequest))
                .ipAddress(getClientIpAddress(httpRequest))
                .build();
        return refreshTokenRepository.save(token);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        String companySlug = null;
        String companyName = null;
        if (user != null && user.getRoles() != null && (user.getRoles().contains(Role.ROLE_COMPANY_ADMIN) || user.getRoles().contains(Role.ROLE_HR))) {
            Optional<HrProfile> hrOpt = hrProfileRepository.findByUserId(user.getId());
            if (hrOpt.isPresent() && hrOpt.get().getCompany() != null) {
                companySlug = hrOpt.get().getCompany().getSlug();
                companyName = hrOpt.get().getCompany().getName();
            }
        }

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(appProperties.getJwt().getAccessTokenExpiryMs() / 1000)
                .userId(user != null ? user.getId() : 1L)
                .email(user != null ? user.getEmail() : "")
                .firstName(user != null ? user.getFirstName() : "")
                .lastName(user != null ? user.getLastName() : "")
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .roles(user != null ? user.getRoles() : Collections.emptySet())
                .emailVerified(user != null && user.isEmailVerified())
                .companySlug(companySlug)
                .companyName(companyName)
                .build();
    }

    private AuthResponse buildAuthResponse(HrProfile hrProfile, String accessToken, String refreshToken) {
        String companySlug = hrProfile.getCompany() != null ? hrProfile.getCompany().getSlug() : null;
        String companyName = hrProfile.getCompany() != null ? hrProfile.getCompany().getName() : null;

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(appProperties.getJwt().getAccessTokenExpiryMs() / 1000)
                .userId(hrProfile.getId())
                .email(hrProfile.getEmail())
                .firstName(hrProfile.getFirstName())
                .lastName(hrProfile.getLastName())
                .avatarUrl(hrProfile.getAvatarUrl())
                .roles(Set.of(Role.ROLE_HR))
                .emailVerified(true)
                .companySlug(companySlug)
                .companyName(companyName)
                .build();
    }

    private String getClientIpAddress(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String getClientUserAgent(HttpServletRequest request) {
        if (request == null) return null;
        String ua = request.getHeader("User-Agent");
        return ua != null && ua.length() > 500 ? ua.substring(0, 500) : ua;
    }

    private UserPrincipal loadUserPrincipal(User user) {
        Optional<HrCredential> hrCred = hrCredentialRepository.findByUserId(user.getId());
        if (hrCred.isPresent()) {
            return new UserPrincipal(user, hrCred.get());
        }
        Optional<CompanyCredential> compCred = companyCredentialRepository.findByUserId(user.getId());
        if (compCred.isPresent()) {
            return new UserPrincipal(user, compCred.get());
        }
        Optional<AppDevCredential> devCred = appDevCredentialRepository.findByUserId(user.getId());
        if (devCred.isPresent()) {
            return new UserPrincipal(user, devCred.get());
        }
        Optional<ManagementTeamCredential> mgmtCred = managementTeamCredentialRepository.findByUserId(user.getId());
        if (mgmtCred.isPresent()) {
            return new UserPrincipal(user, mgmtCred.get());
        }
        Optional<UserCredential> userCred = userCredentialRepository.findByUserId(user.getId());
        return userCred.map(cred -> new UserPrincipal(user, cred)).orElseGet(() -> new UserPrincipal(user));
    }

    private void recordSuccessfulLogin(User user) {
        if (user == null) return;
        hrCredentialRepository.findByUserId(user.getId())
                .ifPresent(c -> hrCredentialRepository.recordSuccessfulLogin(c.getId(), Instant.now()));
        companyCredentialRepository.findByUserId(user.getId())
                .ifPresent(c -> companyCredentialRepository.recordSuccessfulLogin(c.getId(), Instant.now()));
        appDevCredentialRepository.findByUserId(user.getId())
                .ifPresent(c -> appDevCredentialRepository.recordSuccessfulLogin(c.getId(), Instant.now()));
        managementTeamCredentialRepository.findByUserId(user.getId())
                .ifPresent(c -> managementTeamCredentialRepository.recordSuccessfulLogin(c.getId(), Instant.now()));
        userCredentialRepository.findByUserId(user.getId())
                .ifPresent(c -> userCredentialRepository.recordSuccessfulLogin(c.getId(), Instant.now()));
    }
}
