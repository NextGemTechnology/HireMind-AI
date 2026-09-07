package com.talentiq.service.auth;

import com.talentiq.dto.auth.*;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Authentication service contract.
 * Defines all auth operations — implementations can be swapped without touching the controller.
 */
public interface AuthService {

    /**
     * Send 4-digit verification OTP to user email before registration.
     */
    void sendRegistrationOtp(SendRegistrationOtpRequest request, HttpServletRequest httpRequest);

    /**
     * Register a new user account with mandatory 4-digit email verification OTP.
     */
    AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest);

    /**
     * Authenticate with email + password. Returns access + refresh tokens.
     */
    AuthResponse login(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginCandidate(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginHr(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginCompany(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginAppDeveloper(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginManagementTeam(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginAdmin(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginSuperAdmin(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse registerCandidate(RegisterRequest request, HttpServletRequest httpRequest);

    AuthResponse registerHr(RegisterRequest request, HttpServletRequest httpRequest);

    AuthResponse registerCompany(RegisterRequest request, HttpServletRequest httpRequest);

    AuthResponse registerAppDeveloper(RegisterRequest request, HttpServletRequest httpRequest);

    AuthResponse registerManagementTeam(RegisterRequest request, HttpServletRequest httpRequest);

    /**
     * Rotate the refresh token. Invalidates old token, issues new pair.
     */
    AuthResponse refreshToken(RefreshTokenRequest request, HttpServletRequest httpRequest);

    /**
     * Authenticate or register with Google OAuth.
     */
    AuthResponse googleLogin(GoogleAuthRequest request, HttpServletRequest httpRequest);

    /**
     * Revoke all refresh tokens and blacklist current JWT access token for instant expiration.
     */
    void logout(Long userId, String accessToken);

    void logout(Long userId);

    /**
     * Verify email using the one-time token sent by email.
     */
    void verifyEmail(VerifyEmailRequest request);

    /**
     * Resend verification email to an unverified address.
     */
    void resendVerificationEmail(String email);

    /**
     * Initiate password reset by generating and emailing a 4-digit OTP.
     */
    void forgotPassword(ForgotPasswordRequest request);

    /**
     * Verify the 4-digit OTP sent to the user's email.
     */
    void verifyPasswordResetOtp(VerifyOtpRequest request);

    /**
     * Complete password reset using verified 4-digit OTP or reset token and set new password.
     */
    void resetPassword(ResetPasswordRequest request);

    /**
     * Verify 4-digit 2FA OTP code and complete Admin login.
     */
    AuthResponse verify2FaAdmin(TwoFactorVerifyRequest request, HttpServletRequest httpRequest);

    /**
     * Resend 4-digit 2FA code for an active Admin 2FA session.
     */
    void resend2FaOtp(TwoFactorResendRequest request, HttpServletRequest httpRequest);
}
