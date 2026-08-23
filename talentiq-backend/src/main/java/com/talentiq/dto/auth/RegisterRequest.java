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
}
