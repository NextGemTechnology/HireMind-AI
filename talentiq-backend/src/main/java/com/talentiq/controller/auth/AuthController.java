package com.talentiq.controller.auth;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.auth.*;
import com.talentiq.service.auth.AuthService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication REST controller.
 * All endpoints are under /api/v1/auth/
 *
 * Public endpoints (no auth required):
 *   POST /register
 *   POST /login
 *   POST /refresh
 *   POST /verify-email
 *   POST /resend-verification
 *   POST /forgot-password
 *   POST /reset-password
 *
 * Authenticated:
 *   POST /logout
 */
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, token refresh, email verification, password reset")
public class AuthController {

    private final AuthService authService;

    // ── Register ──────────────────────────────────────────────────────────────

    @PostMapping("/register")
    @SecurityRequirements  // No auth required
    @Operation(
            summary = "Register a new user",
            description = "Creates a new CANDIDATE or HR account. Sends email verification. " +
                    "Tokens are NOT returned until email is verified."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.register(request, httpRequest);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Registration successful. Please check your email to verify your account.",
                        response));
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(
            summary = "Universal Login",
            description = "Authenticate with email and password. Optional requiredRole parameter enforces RBAC."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/candidate/login")
    @SecurityRequirements
    @Operation(
            summary = "Candidate Login",
            description = "Authenticate candidate accounts strictly. Rejects HR or Admin accounts attempting candidate login."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> loginCandidate(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.loginCandidate(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Candidate login successful", response));
    }

    @PostMapping("/hr/login")
    @SecurityRequirements
    @Operation(
            summary = "HR Recruiter Login",
            description = "Authenticate HR recruiter accounts strictly. Rejects Candidate accounts attempting HR login."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> loginHr(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.loginHr(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("HR Recruiter login successful", response));
    }

    @PostMapping("/admin/login")
    @SecurityRequirements
    @Operation(
            summary = "Super Admin Login",
            description = "Authenticate Super Admin accounts strictly."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> loginAdmin(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.loginAdmin(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Super Admin login successful", response));
    }

    // ── Google OAuth Login ───────────────────────────────────────────────────

    @PostMapping("/google")
    @SecurityRequirements
    @Operation(
            summary = "Google OAuth Login / Sign Up",
            description = "Authenticate or register user via Google OAuth credential. Requires @gmail.com email."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(
            @Valid @RequestBody GoogleAuthRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.googleLogin(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Google authentication successful", response));
    }

    // ── Refresh Token ─────────────────────────────────────────────────────────

    @PostMapping("/refresh")
    @SecurityRequirements
    @Operation(
            summary = "Refresh access token",
            description = "Exchange a valid refresh token for a new access token + rotated refresh token. " +
                    "Old refresh token is immediately invalidated."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.refreshToken(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
    }

    // ── Logout with Instant Token Revocation ──────────────────────────────────

    @PostMapping("/logout")
    @Operation(
            summary = "Logout",
            description = "Revokes all refresh tokens and instantly blacklists the current JWT access token."
    )
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        String authHeader = httpRequest.getHeader("Authorization");
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        Long userId = principal != null ? principal.getId() : null;
        authService.logout(userId, token);

        return ResponseEntity.ok(ApiResponse.success("Logged out successfully and token destroyed"));
    }

    // ── Email Verification ────────────────────────────────────────────────────

    @PostMapping("/verify-email")
    @SecurityRequirements
    @Operation(
            summary = "Verify email address",
            description = "Confirms the email address using the one-time token sent to the user's inbox."
    )
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {

        authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully. You can now log in."));
    }

    @PostMapping("/resend-verification")
    @SecurityRequirements
    @Operation(
            summary = "Resend verification email",
            description = "Re-sends the email verification link to the given email address."
    )
    public ResponseEntity<ApiResponse<Void>> resendVerification(
            @RequestParam String email) {

        authService.resendVerificationEmail(email);
        return ResponseEntity.ok(ApiResponse.success("Verification email sent. Please check your inbox."));
    }

    // ── Password Reset with 4-Digit OTP ───────────────────────────────────────

    @PostMapping("/forgot-password")
    @SecurityRequirements
    @Operation(
            summary = "Request 4-digit password reset OTP",
            description = "Generates and sends a 4-digit OTP to the user's email address."
    )
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
                "A 4-digit OTP has been sent to your email. Please check your inbox."));
    }

    @PostMapping("/verify-otp")
    @SecurityRequirements
    @Operation(
            summary = "Verify 4-digit password reset OTP",
            description = "Validates the 4-digit OTP sent to the user's email address."
    )
    public ResponseEntity<ApiResponse<Void>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        authService.verifyPasswordResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully. You may now set a new password."));
    }

    @PostMapping("/reset-password")
    @SecurityRequirements
    @Operation(
            summary = "Reset password",
            description = "Sets a new password using verified 4-digit OTP or reset token."
    )
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful. Please log in with your new password."));
    }
}
