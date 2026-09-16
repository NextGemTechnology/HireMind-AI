package com.talentiq.dto.auth;

import com.talentiq.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Request DTO for sending registration email verification OTP.
 */
@Data
public class SendRegistrationOtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]+\\.(com|org|net|edu|gov|in|co\\.in)$", flags = Pattern.Flag.CASE_INSENSITIVE, message = "Security Policy: Only official @gmail.com email addresses are permitted (disposable/temporary emails are blocked).")
    private String email;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotNull(message = "Role is required")
    private Role role; // ROLE_CANDIDATE or ROLE_HR
}
