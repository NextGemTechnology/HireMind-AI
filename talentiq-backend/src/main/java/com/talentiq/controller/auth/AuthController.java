package com.talentiq.controller.auth;

import com.talentiq.common.enums.Role;
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
 * Dedicated Role-Specific Endpoints:
 *   - /candidate/login, /candidate/register, /candidate/send-otp, /candidate/forgot-password
 *   - /hr/login, /hr/register, /hr/send-otp, /hr/forgot-password
 *   - /company/login, /company/register, /company/send-otp, /company/forgot-password
 *   - /app-developer/login, /app-developer/register, /app-developer/send-otp, /app-developer/forgot-password
 *   - /management/login, /management/register, /management/send-otp, /management/forgot-password
 */
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, token refresh, email verification, password reset")
public class AuthController {

    private final AuthService authService;

    // ── 1. CANDIDATE AUTHENTICATION ENDPOINTS ─────────────────────────────────

    @PostMapping("/candidate/send-otp")
    @SecurityRequirements
    @Operation(summary = "Candidate Send OTP", description = "Sends a 4-digit verification code to candidate @gmail.com.")
    public ResponseEntity<ApiResponse<Void>> sendCandidateOtp(
            @Valid @RequestBody SendRegistrationOtpRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_CANDIDATE);
        authService.sendRegistrationOtp(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(
                "A 4-digit verification code has been dispatched to " + request.getEmail() + ". Please enter the code to complete registration."));
    }

    @PostMapping("/candidate/register")
    @SecurityRequirements
    @Operation(summary = "Candidate Registration", description = "Creates a new candidate account with credentials stored strictly in user_credentials.")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCandidate(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.registerCandidate(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Candidate registration successful. Account created!", response));
    }

    @PostMapping("/candidate/login")
    @SecurityRequirements
    @Operation(summary = "Candidate Login", description = "Authenticate candidate accounts strictly against user_credentials table.")
    public ResponseEntity<ApiResponse<AuthResponse>> loginCandidate(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.loginCandidate(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Candidate login successful", response));
    }

    @PostMapping("/candidate/forgot-password")
    @SecurityRequirements
    @Operation(summary = "Candidate Forgot Password", description = "Dispatches a 4-digit password reset OTP to candidate email.")
    public ResponseEntity<ApiResponse<Void>> forgotPasswordCandidate(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("A 4-digit OTP has been sent to your email. Please check your inbox."));
    }

    @PostMapping("/candidate/verify-otp")
    @SecurityRequirements
    @Operation(summary = "Candidate Verify OTP", description = "Validates 4-digit password reset OTP.")
    public ResponseEntity<ApiResponse<Void>> verifyOtpCandidate(
            @Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyPasswordResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully. You may now set a new password."));
    }

    @PostMapping("/candidate/reset-password")
    @SecurityRequirements
    @Operation(summary = "Candidate Reset Password", description = "Resets password in user_credentials.")
    public ResponseEntity<ApiResponse<Void>> resetPasswordCandidate(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful. Please log in with your new password."));
    }

    // ── 2. HR RECRUITER AUTHENTICATION ENDPOINTS ──────────────────────────────

    @PostMapping("/hr/send-otp")
    @SecurityRequirements
    @Operation(summary = "HR Recruiter Send OTP", description = "Sends a 4-digit verification code to HR recruiter @gmail.com.")
    public ResponseEntity<ApiResponse<Void>> sendHrOtp(
            @Valid @RequestBody SendRegistrationOtpRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_HR);
        authService.sendRegistrationOtp(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(
                "A 4-digit verification code has been dispatched to " + request.getEmail() + ". Please enter the code to complete registration."));
    }

    @PostMapping("/hr/register")
    @SecurityRequirements
    @Operation(summary = "HR Recruiter Registration", description = "Creates a new HR account with credentials stored strictly in hr_credentials.")
    public ResponseEntity<ApiResponse<AuthResponse>> registerHr(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.registerHr(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("HR Recruiter registration successful. Account created!", response));
    }

    @PostMapping("/hr/login")
    @SecurityRequirements
    @Operation(summary = "HR Recruiter Login", description = "Authenticate HR recruiter accounts strictly against hr_credentials table.")
    public ResponseEntity<ApiResponse<AuthResponse>> loginHr(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.loginHr(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("HR Recruiter login successful", response));
    }

    @PostMapping("/hr/forgot-password")
    @SecurityRequirements
    @Operation(summary = "HR Forgot Password", description = "Dispatches a 4-digit password reset OTP to HR email.")
    public ResponseEntity<ApiResponse<Void>> forgotPasswordHr(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("A 4-digit OTP has been sent to your email. Please check your inbox."));
    }

    @PostMapping("/hr/verify-otp")
    @SecurityRequirements
    @Operation(summary = "HR Verify OTP", description = "Validates 4-digit password reset OTP.")
    public ResponseEntity<ApiResponse<Void>> verifyOtpHr(
            @Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyPasswordResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully. You may now set a new password."));
    }

    @PostMapping("/hr/reset-password")
    @SecurityRequirements
    @Operation(summary = "HR Reset Password", description = "Resets password in hr_credentials.")
    public ResponseEntity<ApiResponse<Void>> resetPasswordHr(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful. Please log in with your new password."));
    }

    // ── 3. COMPANY EXECUTIVE AUTHENTICATION ENDPOINTS ─────────────────────────

    @PostMapping("/company/send-otp")
    @SecurityRequirements
    @Operation(summary = "Company Admin Send OTP", description = "Sends a 4-digit verification code to Company Executive email.")
    public ResponseEntity<ApiResponse<Void>> sendCompanyOtp(
            @Valid @RequestBody SendRegistrationOtpRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_COMPANY_ADMIN);
        authService.sendRegistrationOtp(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(
                "A 4-digit verification code has been dispatched to " + request.getEmail() + ". Please enter the code to complete registration."));
    }

    @PostMapping("/company/register")
    @SecurityRequirements
    @Operation(summary = "Company Admin Registration", description = "Creates a new Company Executive account with credentials stored strictly in company_credentials.")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCompany(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_COMPANY_ADMIN);
        AuthResponse response = authService.registerCompany(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Company Executive registration successful. Account created!", response));
    }

    @PostMapping("/company/login")
    @SecurityRequirements
    @Operation(summary = "Company Admin Login", description = "Authenticate Company Executive accounts strictly against company_credentials table.")
    public ResponseEntity<ApiResponse<AuthResponse>> loginCompany(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.loginCompany(request, httpRequest);
        String msg = response.isRequires2Fa()
                ? "Two-Factor Authentication required. A 4-digit 2FA code has been dispatched to your email."
                : "Company Executive login successful";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/company/forgot-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> forgotPasswordCompany(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("A 4-digit OTP has been sent to your email. Please check your inbox."));
    }

    @PostMapping("/company/verify-otp")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> verifyOtpCompany(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyPasswordResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully. You may now set a new password."));
    }

    @PostMapping("/company/reset-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> resetPasswordCompany(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful. Please log in with your new password."));
    }

    // ── 4. APPLICATION DEVELOPER AUTHENTICATION ENDPOINTS ─────────────────────

    @PostMapping("/app-developer/send-otp")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> sendAppDevOtp(
            @Valid @RequestBody SendRegistrationOtpRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_APP_DEVELOPER);
        authService.sendRegistrationOtp(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(
                "A 4-digit verification code has been dispatched to " + request.getEmail() + ". Please enter the code to complete registration."));
    }

    @PostMapping("/app-developer/register")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> registerAppDeveloper(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_APP_DEVELOPER);
        AuthResponse response = authService.registerAppDeveloper(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Application Developer registration successful. Account created!", response));
    }

    @PostMapping("/app-developer/login")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> loginAppDeveloper(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.loginAppDeveloper(request, httpRequest);
        String msg = response.isRequires2Fa()
                ? "Two-Factor Authentication required. A 4-digit 2FA code has been dispatched to your email."
                : "Application Developer login successful";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/app-developer/forgot-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> forgotPasswordAppDev(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("A 4-digit OTP has been sent to your email. Please check your inbox."));
    }

    @PostMapping("/app-developer/verify-otp")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> verifyOtpAppDev(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyPasswordResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully. You may now set a new password."));
    }

    @PostMapping("/app-developer/reset-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> resetPasswordAppDev(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful. Please log in with your new password."));
    }

    // ── 5. MANAGEMENT TEAM AUTHENTICATION ENDPOINTS ───────────────────────────

    @PostMapping("/management/send-otp")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> sendManagementOtp(
            @Valid @RequestBody SendRegistrationOtpRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_MANAGEMENT_TEAM);
        authService.sendRegistrationOtp(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(
                "A 4-digit verification code has been dispatched to " + request.getEmail() + ". Please enter the code to complete registration."));
    }

    @PostMapping("/management/register")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> registerManagementTeam(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        request.setRole(Role.ROLE_MANAGEMENT_TEAM);
        AuthResponse response = authService.registerManagementTeam(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Management Team registration successful. Account created!", response));
    }

    @PostMapping("/management/login")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> loginManagementTeam(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.loginManagementTeam(request, httpRequest);
        String msg = response.isRequires2Fa()
                ? "Two-Factor Authentication required. A 4-digit 2FA code has been dispatched to your email."
                : "Management Team login successful";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/management/forgot-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> forgotPasswordManagement(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("A 4-digit OTP has been sent to your email. Please check your inbox."));
    }

    @PostMapping("/management/verify-otp")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> verifyOtpManagement(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyPasswordResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully. You may now set a new password."));
    }

    @PostMapping("/management/reset-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> resetPasswordManagement(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful. Please log in with your new password."));
    }

    // ── 6. UNIVERSAL DISPATCHER ENDPOINTS (BACKWARDS COMPATIBILITY) ────────────

    @PostMapping("/register/send-otp")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> sendRegistrationOtp(
            @Valid @RequestBody SendRegistrationOtpRequest request,
            HttpServletRequest httpRequest) {
        authService.sendRegistrationOtp(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(
                "A 4-digit verification code has been dispatched to " + request.getEmail() + ". Please enter the code to complete registration."));
    }

    @PostMapping("/register")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        AuthResponse response = authService.register(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful. Account created!", response));
    }

    @PostMapping("/login")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/admin/login")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> loginAdmin(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.loginAdmin(request, httpRequest);
        String msg = response.isRequires2Fa()
                ? "Two-Factor Authentication required. A 4-digit 2FA code has been dispatched to your email."
                : "Admin login successful";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/admin/2fa-verify")
    @SecurityRequirements
    @Operation(summary = "Admin 2FA Verification", description = "Validates 4-digit 2FA OTP and issues full access & refresh tokens.")
    public ResponseEntity<ApiResponse<AuthResponse>> verify2FaAdmin(
            @Valid @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.verify2FaAdmin(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("2FA verification successful. Welcome to HireMind AI Admin!", response));
    }

    @PostMapping("/admin/2fa-resend")
    @SecurityRequirements
    @Operation(summary = "Admin 2FA Resend Code", description = "Resends a new 4-digit 2FA code to admin email.")
    public ResponseEntity<ApiResponse<Void>> resend2FaAdmin(
            @Valid @RequestBody TwoFactorResendRequest request,
            HttpServletRequest httpRequest) {
        authService.resend2FaOtp(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("A new 4-digit 2FA code has been sent to your email."));
    }

    @PostMapping("/company/2fa-verify")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> verify2FaCompany(
            @Valid @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {
        return verify2FaAdmin(request, httpRequest);
    }

    @PostMapping("/app-developer/2fa-verify")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> verify2FaAppDev(
            @Valid @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {
        return verify2FaAdmin(request, httpRequest);
    }

    @PostMapping("/management/2fa-verify")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> verify2FaManagement(
            @Valid @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {
        return verify2FaAdmin(request, httpRequest);
    }

    @PostMapping("/google")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(
            @Valid @RequestBody GoogleAuthRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.googleLogin(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Google authentication successful", response));
    }

    @PostMapping("/refresh")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.refreshToken(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
    }

    @PostMapping("/logout")
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

    @PostMapping("/verify-email")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully. You can now log in."));
    }

    @PostMapping("/resend-verification")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> resendVerification(@RequestParam String email) {
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok(ApiResponse.success("Verification email sent. Please check your inbox."));
    }

    @PostMapping("/forgot-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("A 4-digit OTP has been sent to your email. Please check your inbox."));
    }

    @PostMapping("/verify-otp")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyPasswordResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully. You may now set a new password."));
    }

    @PostMapping("/reset-password")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful. Please log in with your new password."));
    }
}
