package com.talentiq.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.talentiq.common.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.util.Set;

/**
 * Authentication response returned on successful login or token refresh.
 * Contains both tokens and essential user info to avoid a second API call.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private String accessToken;
    private String refreshToken;

    @Builder.Default
    private String tokenType = "Bearer";

    private Long expiresIn;   // access token expiry in seconds

    // User summary — saves the client an extra /me call
    private Long userId;
    private String email;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private Set<Role> roles;
    private boolean emailVerified;

    // Two-Factor Authentication fields for Admin logins
    private boolean requires2Fa;
    private String twoFactorToken;
    private String twoFactorMethod;

    // Company attributes for branded admin portal routing
    private String companySlug;
    private String companyName;
}
