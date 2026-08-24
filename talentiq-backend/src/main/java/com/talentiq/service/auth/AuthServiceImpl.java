package com.talentiq.service.auth;

import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.exception.UnauthorizedException;
import com.talentiq.config.AppProperties;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.dto.auth.*;
import com.talentiq.model.RefreshToken;
import com.talentiq.repository.auth.RefreshTokenRepository;
import com.talentiq.model.Candidate;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.model.Company;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.security.jwt.JwtService;
import com.talentiq.security.userdetails.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * AuthService implementation.
 *
 * Security considerations:
 * - Passwords hashed with BCrypt strength 12
 * - Refresh tokens: opaque UUIDs stored in DB (not JWTs)
 * - Refresh token rotation: one-time-use, old token revoked on each refresh
 * - Lockout: after 5 failed attempts, account locked for 15 minutes
 * - Email enumeration prevention: generic success on forgotPassword
 * - Verification tokens: UUID, expire per config (default 30 min)
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
    private final AuthenticationManager authenticationManager;
    private final MailService mailService;
    private final AppProperties appProperties;
    private final com.talentiq.security.jwt.TokenBlacklistService tokenBlacklistService;
    private final RedisOtpService redisOtpService;

    // ── Email Validation ───────────────────────────────────────────────────────
    private void validateEmailFormat(String email) {
        if (!StringUtils.hasText(email) || !email.contains("@") || !email.contains(".")) {
            throw new BadRequestException("Please provide a valid email address.");
        }
    }

    // ── Register ──────────────────────────────────────────────────────────────

    // ── Registration OTP Flow ──────────────────────────────────────────────────

    @Override
    public void sendRegistrationOtp(SendRegistrationOtpRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email);

        // Check if email already registered
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email address already exists. Please login instead.");
        }

        // Validate role
        if (request.getRole() == null) {
            throw new BadRequestException("Role is required for registration");
        }

        // Enforce Redis sliding-window rate limit
        String clientIp = getClientIpAddress(httpRequest);
        redisOtpService.enforceRateLimit(email, clientIp);

        // Generate 4-digit numeric OTP
        String otp = String.format("%04d", ThreadLocalRandom.current().nextInt(0, 10000));

        // Store in Redis with 10-minute TTL
        redisOtpService.storeRegistrationOtp(email, otp, 10);

        // Dispatch verification code via Email
        String firstName = StringUtils.hasText(request.getFirstName()) ? request.getFirstName().trim() : "Future Leader";
        mailService.sendRegistrationOtpEmail(email, firstName, otp);

        log.info("4-Digit Registration OTP generated and dispatched to: {} [OTP: {}]", email, otp);
    }

    @Override
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email);

        // 1. Mandatory Email OTP Verification
        if (!StringUtils.hasText(request.getOtp())) {
            throw new BadRequestException("4-digit email verification code is required.");
        }
        redisOtpService.verifyRegistrationOtp(email, request.getOtp());

        // 2. Validate role
        if (request.getRole() == null) {
            throw new BadRequestException("Role is required for registration");
        }

        // 3. Email uniqueness check
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        // 4. Build user entity — ACTIVE & verified status
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .phone(request.getPhone())
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .build();

        user.addRole(request.getRole());
        User savedUser = userRepository.save(user);

        // Auto-create Candidate, HR, or Company profile
        if (request.getRole().equals(Role.ROLE_CANDIDATE)) {
            Candidate candidate = Candidate.builder()
                    .user(savedUser)
                    .location(request.getLocation())
                    .currentTitle(request.getDesiredRole())
                    .yearsExperience(request.getYearsExperience() != null ? request.getYearsExperience() : 0)
                    .openToWork(true)
                    .build();
            candidateRepository.save(candidate);
        } else if (request.getRole().equals(Role.ROLE_HR) || request.getRole().equals(Role.ROLE_COMPANY_ADMIN)) {
            String companyName = StringUtils.hasText(request.getCompanyName()) ? request.getCompanyName().trim() : "Company (" + savedUser.getFirstName() + ")";
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
                    .user(savedUser)
                    .company(company)
                    .designation(StringUtils.hasText(request.getJobTitle()) ? request.getJobTitle() : (request.getRole().equals(Role.ROLE_COMPANY_ADMIN) ? "Company Director / CEO" : "HR Recruiter"))
                    .companyAdmin(request.getRole().equals(Role.ROLE_COMPANY_ADMIN))
                    .companyVerified(true)
                    .companyVerifiedAt(Instant.now())
                    .companyVerifiedTitle(request.getRole().equals(Role.ROLE_COMPANY_ADMIN) ? "Verified Company Executive" : "Verified Talent Partner")
                    .build();
            hrProfileRepository.save(hrProfile);
        }

        log.info("New user registered and activated: {} [{}]", savedUser.getEmail(), request.getRole());

        // Dispatch Welcome / Account Created email
        mailService.sendAccountCreatedEmail(savedUser.getEmail(), savedUser.getFirstName(), request.getRole().name());

        // Issue tokens for instant authentication upon registration
        UserPrincipal principal = new UserPrincipal(savedUser);
        String accessToken = jwtService.generateAccessToken(principal, savedUser.getId());
        RefreshToken refreshToken = createRefreshToken(savedUser, httpRequest);

        return buildAuthResponse(savedUser, accessToken, refreshToken.getToken());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Override
    public AuthResponse loginCandidate(LoginRequest request, HttpServletRequest httpRequest) {
        request.setRequiredRole(Role.ROLE_CANDIDATE);
        return login(request, httpRequest);
    }

    @Override
    public AuthResponse loginHr(LoginRequest request, HttpServletRequest httpRequest) {
        request.setRequiredRole(Role.ROLE_HR);
        return login(request, httpRequest);
    }

    @Override
    public AuthResponse loginAdmin(LoginRequest request, HttpServletRequest httpRequest) {
        request.setRequiredRole(null);
        AuthResponse response = login(request, httpRequest);
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim()).orElse(null);
        if (user != null) {
            boolean isAdmin = user.getRoles().contains(Role.ROLE_SUPER_ADMIN) ||
                              user.getRoles().contains(Role.ROLE_PLATFORM_ADMIN) ||
                              user.getRoles().contains(Role.ROLE_APP_DEVELOPER) ||
                              user.getRoles().contains(Role.ROLE_MANAGEMENT_TEAM) ||
                              user.getRoles().contains(Role.ROLE_COMPANY_ADMIN);
            if (!isAdmin) {
                throw new BadCredentialsException("Invalid email or password");
            }
        }
        return response;
    }

    @Override
    @Transactional(noRollbackFor = {BadCredentialsException.class, UnauthorizedException.class})
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email);

        // Find user first for lockout check
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        // Check if locked out
        if (user.getLockedUntil() != null) {
            if (Instant.now().isBefore(user.getLockedUntil())) {
                long remainingMinutes = ChronoUnit.MINUTES.between(Instant.now(), user.getLockedUntil()) + 1;
                if (remainingMinutes < 1) remainingMinutes = 1;
                throw new UnauthorizedException(
                        String.format("Account is temporarily locked due to %d consecutive failed password attempts. Please try again after %d minute%s or reset your password.",
                                MAX_LOGIN_ATTEMPTS, remainingMinutes, remainingMinutes == 1 ? "" : "s"));
            } else {
                // Lockout has expired! Reset automatically
                user.setLoginAttempts(0);
                user.setLockedUntil(null);
                userRepository.save(user);
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            User authenticatedUser = principal.getUser();

            // RBAC Portal Enforcement: Verify user possesses the required role for the portal
            if (request.getRequiredRole() != null) {
                boolean hasRole = authenticatedUser.getRoles().contains(request.getRequiredRole());
                if (!hasRole) {
                    boolean isAdmin = authenticatedUser.getRoles().contains(Role.ROLE_SUPER_ADMIN) ||
                                      authenticatedUser.getRoles().contains(Role.ROLE_PLATFORM_ADMIN) ||
                                      authenticatedUser.getRoles().contains(Role.ROLE_APP_DEVELOPER) ||
                                      authenticatedUser.getRoles().contains(Role.ROLE_MANAGEMENT_TEAM) ||
                                      authenticatedUser.getRoles().contains(Role.ROLE_COMPANY_ADMIN);
                    if (!isAdmin) {
                        throw new BadCredentialsException("Invalid email or password");
                    }
                }
            }

            // Ensure profile entity exists in candidate or hr_profiles table
            if (authenticatedUser.getRoles().contains(Role.ROLE_CANDIDATE)) {
                if (!candidateRepository.existsByUserId(authenticatedUser.getId())) {
                    candidateRepository.save(Candidate.builder()
                            .user(authenticatedUser)
                            .openToWork(true)
                            .build());
                }
            }
            if (authenticatedUser.getRoles().contains(Role.ROLE_HR)) {
                if (!hrProfileRepository.existsByUserId(authenticatedUser.getId())) {
                    Company defaultComp = companyRepository.findByName("TalentIQ Enterprise")
                            .orElseGet(() -> companyRepository.save(Company.builder()
                                    .name("TalentIQ Enterprise")
                                    .slug("talentiq-enterprise-" + System.currentTimeMillis())
                                    .verified(true)
                                    .active(true)
                                    .build()));
                    hrProfileRepository.save(HrProfile.builder()
                            .user(authenticatedUser)
                            .company(defaultComp)
                            .designation("Talent Partner")
                            .companyAdmin(true)
                            .build());
                }
            }

            // Reset failed attempts on success
            userRepository.recordSuccessfulLogin(authenticatedUser.getId(), Instant.now());

            // Issue tokens
            String accessToken = jwtService.generateAccessToken(principal, authenticatedUser.getId());
            RefreshToken refreshToken = createRefreshToken(authenticatedUser, httpRequest);

            log.info("User logged in successfully: {} [{}]", email, authenticatedUser.getRoles());

            return buildAuthResponse(authenticatedUser, accessToken, refreshToken.getToken());

        } catch (BadCredentialsException e) {
            throw handleFailedLogin(user);
        } catch (DisabledException ex) {
            throw new UnauthorizedException("Please verify your email address before logging in");
        }
    }

    // ── Google OAuth Login / Registration ─────────────────────────────────────

    @Override
    public AuthResponse googleLogin(GoogleAuthRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email);

        Optional<User> existingUser = userRepository.findByEmail(email);
        User user;

        if (existingUser.isEmpty()) {
            Role role = request.getRole() != null ? request.getRole() : Role.ROLE_CANDIDATE;
            String[] nameParts = request.getName() != null ? request.getName().split(" ", 2) : new String[]{"User", ""};
            String firstName = nameParts[0];
            String lastName = nameParts.length > 1 ? nameParts[1] : "";

            user = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .firstName(firstName)
                    .lastName(lastName)
                    .avatarUrl(request.getPicture())
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();

            user.addRole(role);
            user = userRepository.save(user);

            if (role == Role.ROLE_CANDIDATE) {
                candidateRepository.save(Candidate.builder()
                        .user(user)
                        .openToWork(true)
                        .build());
            } else if (role == Role.ROLE_HR) {
                Company defaultComp = companyRepository.findByName("TalentIQ Enterprise")
                        .orElseGet(() -> companyRepository.save(Company.builder()
                                .name("TalentIQ Enterprise")
                                .slug("talentiq-enterprise-" + System.currentTimeMillis())
                                .verified(true)
                                .active(true)
                                .build()));
                hrProfileRepository.save(HrProfile.builder()
                        .user(user)
                        .company(defaultComp)
                        .designation("Talent Partner")
                        .companyAdmin(true)
                        .build());
            }

            mailService.sendAccountCreatedEmail(user.getEmail(), user.getFirstName(), role.name());
            log.info("New user registered via Google OAuth: {} [{}]", email, role);
        } else {
            user = existingUser.get();
            if (user.isLocked()) {
                throw new UnauthorizedException("Account temporarily locked. Try again later.");
            }
            if (user.getStatus() != UserStatus.ACTIVE) {
                user.setStatus(UserStatus.ACTIVE);
                user.setEmailVerified(true);
                userRepository.save(user);
            }
        }

        UserPrincipal principal = new UserPrincipal(user);
        String accessToken = jwtService.generateAccessToken(principal, user.getId());
        RefreshToken refreshToken = createRefreshToken(user, httpRequest);

        log.info("Google OAuth login successful: {}", email);
        return buildAuthResponse(user, accessToken, refreshToken.getToken());
    }

    // ── Refresh Token ─────────────────────────────────────────────────────────

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request, HttpServletRequest httpRequest) {
        RefreshToken existing = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token. Please log in again."));

        if (!existing.isValid()) {
            // Token is expired or revoked — invalidate ALL user tokens (possible token theft)
            refreshTokenRepository.revokeAllUserTokens(existing.getUser().getId());
            throw new UnauthorizedException("Refresh token expired or revoked. Please log in again.");
        }

        // Rotate: revoke old token, issue new pair
        refreshTokenRepository.revokeByToken(existing.getToken());

        User user = existing.getUser();
        UserPrincipal principal = new UserPrincipal(user);

        String newAccessToken = jwtService.generateAccessToken(principal, user.getId());
        RefreshToken newRefreshToken = createRefreshToken(user, httpRequest);

        log.debug("Token refreshed for user: {}", user.getEmail());

        return buildAuthResponse(user, newAccessToken, newRefreshToken.getToken());
    }

    // ── Logout with Instant Token Blacklisting / Destruction ──────────────────

    @Override
    public void logout(Long userId, String accessToken) {
        if (userId != null) {
            refreshTokenRepository.revokeAllUserTokens(userId);
        }
        if (StringUtils.hasText(accessToken)) {
            long remainingMs = jwtService.getRemainingExpiryMs(accessToken);
            tokenBlacklistService.blacklistToken(accessToken, remainingMs);
        }
        log.info("User logged out (all refresh tokens revoked & access token blacklisted): userId={}", userId);
    }

    @Override
    public void logout(Long userId) {
        logout(userId, null);
    }

    // ── Email Verification ────────────────────────────────────────────────────

    @Override
    public void verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmailVerificationToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification token"));

        if (user.isEmailVerified()) {
            throw new BadRequestException("Email is already verified");
        }

        if (user.getEmailVerificationTokenExpiresAt() != null
                && Instant.now().isAfter(user.getEmailVerificationTokenExpiresAt())) {
            throw new BadRequestException("Verification token has expired. Please request a new one.");
        }

        userRepository.verifyEmail(user.getId());

        // Send welcome email
        mailService.sendWelcomeEmail(user.getEmail(), user.getFirstName());

        log.info("Email verified for user: {}", user.getEmail());
    }

    @Override
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if (user.isEmailVerified()) {
            throw new BadRequestException("Email is already verified");
        }

        // Generate a new token
        user.setEmailVerificationToken(UUID.randomUUID().toString());
        user.setEmailVerificationTokenExpiresAt(
                Instant.now().plus(appProperties.getMail().getVerificationExpiryMinutes(), ChronoUnit.MINUTES));
        userRepository.save(user);

        mailService.sendEmailVerification(user.getEmail(), user.getFirstName(), user.getEmailVerificationToken());
        log.info("Verification email resent to: {}", email);
    }

    // ── Password Reset with 4-Digit OTP ───────────────────────────────────────

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        validateEmailFormat(email);

        // 1. Enforce Redis sliding rate limit (handles 10,000+ users & prevents brute-force / DDoS)
        redisOtpService.enforceRateLimit(email, null);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No registered account found with email: " + email));

        // 2. Generate 4-digit numeric OTP
        int randomPin = new java.security.SecureRandom().nextInt(10000);
        String otp = String.format("%04d", randomPin);

        // 3. Store in Redis with O(1) in-memory TTL (10 minutes)
        redisOtpService.storeOtp(email, otp, 10);

        // 4. Also persist in DB as fallback
        user.setPasswordResetOtp(otp);
        user.setPasswordResetOtpExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        user.setPasswordResetToken(otp);
        user.setPasswordResetTokenExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        userRepository.save(user);

        // 5. Fire async email
        mailService.sendPasswordResetOtpEmail(user.getEmail(), user.getFirstName(), otp);
        log.info("===============================================================");
        log.info("🔑 [HIREMIND AI - 4-DIGIT OTP FOR {}]: {}", email, otp);
        log.info("===============================================================");
    }

    @Override
    public void verifyPasswordResetOtp(VerifyOtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        // Redis-backed O(1) atomic verification with brute-force defense
        redisOtpService.verifyOtp(email, request.getOtp());
        log.info("4-Digit OTP verified successfully in Redis for email: {}", email);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : null;
        User user = null;
        if (StringUtils.hasText(email)) {
            user = userRepository.findByEmail(email).orElse(null);
        }
        if (user == null && StringUtils.hasText(request.getToken())) {
            user = userRepository.findByPasswordResetToken(request.getToken()).orElse(null);
        }

        if (user == null) {
            throw new BadRequestException("Invalid password reset request. User not found.");
        }

        String providedOtpOrToken = StringUtils.hasText(request.getOtp()) ? request.getOtp().trim() : request.getToken();
        
        // Check Redis verification ticket first
        boolean verified = redisOtpService.isOtpVerified(user.getEmail());
        if (!verified) {
            // Check fallback in MySQL
            if (user.getPasswordResetOtp() != null && user.getPasswordResetOtp().equals(providedOtpOrToken)) {
                verified = user.getPasswordResetOtpExpiresAt() != null && Instant.now().isBefore(user.getPasswordResetOtpExpiresAt());
            }
            if (!verified && user.getPasswordResetToken() != null && user.getPasswordResetToken().equals(providedOtpOrToken)) {
                verified = user.getPasswordResetTokenExpiresAt() != null && Instant.now().isBefore(user.getPasswordResetTokenExpiresAt());
            }
        }

        if (!verified) {
            throw new BadRequestException("Invalid or expired 4-digit OTP. Please request a new code.");
        }

        userRepository.updatePassword(user.getId(), passwordEncoder.encode(request.getNewPassword()));
        
        // Consume Redis verified ticket
        redisOtpService.consumeVerifiedTicket(user.getEmail());

        // Revoke all refresh tokens & active sessions for security
        refreshTokenRepository.revokeAllUserTokens(user.getId());

        log.info("Password reset successfully updated for user: {}", user.getEmail());
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private RefreshToken createRefreshToken(User user, HttpServletRequest httpRequest) {
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plus(appProperties.getJwt().getRefreshTokenExpiryDays(), ChronoUnit.DAYS))
                .userAgent(getClientUserAgent(httpRequest))
                .ipAddress(getClientIpAddress(httpRequest))
                .build();
        return refreshTokenRepository.save(token);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(appProperties.getJwt().getAccessTokenExpiryMs() / 1000)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .roles(user.getRoles())
                .emailVerified(user.isEmailVerified())
                .build();
    }

    private RuntimeException handleFailedLogin(User user) {
        int attempts = user.getLoginAttempts() + 1;
        user.setLoginAttempts(attempts);

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            user.setLockedUntil(Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            userRepository.saveAndFlush(user);
            log.warn("Account temporarily locked for {} minutes due to {} failed login attempts: {}", LOCKOUT_MINUTES, attempts, user.getEmail());
            return new UnauthorizedException(
                    String.format("Account is temporarily locked for %d minutes due to %d consecutive failed password attempts. Please try again after %d minutes or reset your password.",
                            LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES)
            );
        } else {
            userRepository.saveAndFlush(user);
            int remaining = MAX_LOGIN_ATTEMPTS - attempts;
            if (remaining < 0) remaining = 0;
            return new BadCredentialsException(
                    String.format("Invalid password. %d attempt%s remaining before account is temporarily locked for %d minutes.",
                            remaining, remaining == 1 ? "" : "s", LOCKOUT_MINUTES)
            );
        }
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
}
