package com.talentiq.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]+\\.(com|org|net|edu|gov|in|co\\.in)$", flags = Pattern.Flag.CASE_INSENSITIVE, message = "Security Policy: Only official @gmail.com email addresses are permitted.")
    private String email;
}
