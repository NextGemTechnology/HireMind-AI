package com.talentiq.dto.auth;

import com.talentiq.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request DTO for sending registration email verification OTP.
 */
@Data
public class SendRegistrationOtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotNull(message = "Role is required")
    private Role role; // ROLE_CANDIDATE or ROLE_HR
}
