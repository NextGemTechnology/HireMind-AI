package com.talentiq.service.auth;

import com.talentiq.dto.auth.*;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Authentication service contract.
 * Defines all auth operations — implementations can be swapped without touching the controller.
 */
public interface AuthService {

    /**
     * Register a new user account. Sends verification email. Returns the auth tokens
     * only if email verification is disabled (dev mode). Otherwise, requires verification first.
     */
    AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest);

    /**
     * Authenticate with email + password. Returns access + refresh tokens.
     */
    AuthResponse login(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginCandidate(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginHr(LoginRequest request, HttpServletRequest httpRequest);

    AuthResponse loginAdmin(LoginRequest request, HttpServletRequest httpRequest);

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
}
