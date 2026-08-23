package com.talentiq.dto.auth;

import com.talentiq.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Request DTO for Google OAuth login / registration.
 * Requires email ending in @gmail.com.
 */
@Data
public class GoogleAuthRequest {

    @NotBlank(message = "Google email is required")
    @Email(message = "Invalid email format")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@gmail\\.com$", message = "Email must end with @gmail.com")
    private String email;

    @NotBlank(message = "Name is required")
    private String name;

    private String credential; // Google ID Token / JWT credential
    private String picture;    // Google avatar URL
    private Role role;         // ROLE_CANDIDATE or ROLE_HR
}
