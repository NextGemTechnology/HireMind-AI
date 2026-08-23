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
import java.util.Set;
import java.util.UUID;

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

    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

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

    // ── Email Validation: Must end with @gmail.com ───────────────────────────
    private void validateGmailDomain(String email) {
        if (email == null || !email.trim().endsWith("@gmail.com")) {
            throw new BadRequestException("Only @gmail.com email addresses are allowed for registration and login.");
        }
    }

    // ── Register ──────────────────────────────────────────────────────────────

    @Override
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateGmailDomain(email);

        // Validate only CANDIDATE and HR roles are allowed for public registration
        if (request.getRole() == null
                || (!request.getRole().equals(Role.ROLE_CANDIDATE)
                && !request.getRole().equals(Role.ROLE_HR))) {
            throw new BadRequestException("Only CANDIDATE and HR roles can self-register");
        }

        // Email uniqueness check
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        // Build user entity — ACTIVE status for instant usability
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

        // Auto-create Candidate or HR Profile record
        if (request.getRole().equals(Role.ROLE_CANDIDATE)) {
            Candidate candidate = Candidate.builder()
                    .user(savedUser)
                    .location(request.getLocation())
                    .currentTitle(request.getDesiredRole())
                    .yearsExperience(request.getYearsExperience() != null ? request.getYearsExperience() : 0)
                    .openToWork(true)
                    .build();
            candidateRepository.save(candidate);
        } else if (request.getRole().equals(Role.ROLE_HR)) {
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
                    .designation(StringUtils.hasText(request.getJobTitle()) ? request.getJobTitle() : "HR Recruiter")
                    .companyAdmin(true)
                    .build();
            hrProfileRepository.save(hrProfile);
        }

        log.info("New user registered and activated: {} [{}]", savedUser.getEmail(), request.getRole());

        // Issue tokens for instant authentication upon registration
        UserPrincipal principal = new UserPrincipal(savedUser);
        String accessToken = jwtService.generateAccessToken(principal, savedUser.getId());
        RefreshToken refreshToken = createRefreshToken(savedUser, httpRequest);

        return buildAuthResponse(savedUser, accessToken, refreshToken.getToken());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Override
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateGmailDomain(email);

        // Find user first for lockout check
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        // Check if locked out
        if (user.isLocked()) {
            throw new UnauthorizedException(
                    "Account temporarily locked due to too many failed attempts. Try again later.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            User authenticatedUser = principal.getUser();

            // Reset failed attempts on success
            userRepository.recordSuccessfulLogin(authenticatedUser.getId(), Instant.now());

            // Issue tokens
            String accessToken = jwtService.generateAccessToken(principal, authenticatedUser.getId());
            RefreshToken refreshToken = createRefreshToken(authenticatedUser, httpRequest);

            log.info("User logged in: {}", email);

            return buildAuthResponse(authenticatedUser, accessToken, refreshToken.getToken());

        } catch (BadCredentialsException e) {
            handleFailedLogin(user);
            throw e;
        } catch (DisabledException ex) {
            throw new UnauthorizedException("Please verify your email address before logging in");
        }
    }

    // ── Google OAuth Login / Registration ─────────────────────────────────────

    @Override
    public AuthResponse googleLogin(GoogleAuthRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail().toLowerCase().trim();
        validateGmailDomain(email);

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // Auto-register new Google user
            String fullName = StringUtils.hasText(request.getName()) ? request.getName().trim() : "Google User";
            String[] parts = fullName.split("\\s+", 2);
            String firstName = parts[0];
            String lastName = parts.length > 1 ? parts[1] : "User";

            Role role = request.getRole() != null ? request.getRole() : Role.ROLE_CANDIDATE;

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

            if (role.equals(Role.ROLE_CANDIDATE)) {
                Candidate candidate = Candidate.builder()
                        .user(user)
                        .currentTitle("Open to Opportunities")
                        .yearsExperience(1)
                        .openToWork(true)
                        .build();
                candidateRepository.save(candidate);
            } else if (role.equals(Role.ROLE_HR)) {
                Company company = companyRepository.findByName("Google Recruiter Workspace").orElseGet(() ->
                        companyRepository.save(Company.builder()
                                .name("Google Recruiter Workspace")
                                .slug("google-recruiter-" + System.currentTimeMillis())
                                .verified(true)
                                .active(true)
                                .build())
                );
                HrProfile hrProfile = HrProfile.builder()
                        .user(user)
                        .company(company)
                        .designation("Talent Acquisition Specialist")
                        .companyAdmin(true)
                        .build();
                hrProfileRepository.save(hrProfile);
            }
            log.info("New user registered via Google OAuth: {} [{}]", user.getEmail(), role);
        } else {
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

    // ── Password Reset ────────────────────────────────────────────────────────

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        // Always return success — prevents email enumeration attacks
        userRepository.findByEmail(email).ifPresent(user -> {
            String resetToken = UUID.randomUUID().toString();
            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiresAt(
                    Instant.now().plus(appProperties.getMail().getResetPasswordExpiryMinutes(), ChronoUnit.MINUTES));
            userRepository.save(user);
            mailService.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), resetToken);
            log.info("Password reset email sent to: {}", email);
        });
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (user.getPasswordResetTokenExpiresAt() != null
                && Instant.now().isAfter(user.getPasswordResetTokenExpiresAt())) {
            throw new BadRequestException("Password reset token has expired. Please request a new one.");
        }

        userRepository.updatePassword(user.getId(), passwordEncoder.encode(request.getNewPassword()));

        // Revoke all refresh tokens for security
        refreshTokenRepository.revokeAllUserTokens(user.getId());

        log.info("Password reset successful for user: {}", user.getEmail());
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

    private void handleFailedLogin(User user) {
        int attempts = user.getLoginAttempts() + 1;
        userRepository.incrementLoginAttempts(user.getId());

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            user.setLockedUntil(Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            userRepository.save(user);
            log.warn("Account locked due to {} failed login attempts: {}", attempts, user.getEmail());
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
