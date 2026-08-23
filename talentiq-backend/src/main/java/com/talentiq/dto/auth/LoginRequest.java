package com.talentiq.dto.auth;

import com.talentiq.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@(gmail\\.com|talentiq\\.ai)$", message = "Email must end with @gmail.com or @talentiq.ai")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    private Role requiredRole;
}
