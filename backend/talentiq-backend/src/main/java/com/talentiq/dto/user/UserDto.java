package com.talentiq.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Set;

public class UserDto {

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Response {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        private String avatarUrl;
        private UserStatus status;
        private boolean emailVerified;
        private Set<Role> roles;
        private Instant lastLoginAt;
        private Instant createdAt;
    }

    @Data
    public static class UpdateProfileRequest {
        @Size(min = 2, max = 100)
        private String firstName;

        @Size(min = 2, max = 100)
        private String lastName;

        @Size(max = 20)
        private String phone;

        @Size(max = 500)
        private String avatarUrl;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank
        private String currentPassword;

        @NotBlank
        @Size(min = 8, max = 100)
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
                message = "Password must contain at least one uppercase, one lowercase, one digit, and one special char"
        )
        private String newPassword;
    }
}
