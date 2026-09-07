package com.talentiq.dto.auth;

import com.talentiq.common.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request DTO for user registration.
 * Supports Candidate & HR Recruiter role-specific metadata.
 */
@Data
public class RegisterRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\s'-]+$", message = "First name contains invalid characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\s'-]+$", message = "Last name contains invalid characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]+\\.(com|org|net|edu|gov|in|co\\.in)$", flags = Pattern.Flag.CASE_INSENSITIVE, message = "Security Policy: Only official @gmail.com email addresses are permitted (disposable/temporary emails are blocked).")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    private String password;

    @NotNull(message = "Role is required")
    private Role role;   // ROLE_CANDIDATE or ROLE_HR — public registration only

    // Candidate fields
    private String phone;
    private String location;
    private String desiredRole;
    private Integer yearsExperience;

    // HR fields
    private String companyName;
    private String jobTitle;
    private String companyWebsite;
    private String industry;
    private String companySize;
    private String department;
    private String specialization;

    // Email Verification OTP
    @NotBlank(message = "4-digit email verification code is required")
    @Pattern(regexp = "^[0-9]{4}$", message = "Verification OTP must be 4 digits")
    private String otp;

    // Optional Company Invitation Token for direct company joining & auto-verification
    private String companyInviteToken;
}
