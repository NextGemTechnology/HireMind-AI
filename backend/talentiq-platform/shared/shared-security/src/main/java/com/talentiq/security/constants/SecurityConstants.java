package com.talentiq.security.constants;

public final class SecurityConstants {

    private SecurityConstants() {}

    public static final String HEADER_USER_ID = "X-Auth-User-Id";
    public static final String HEADER_USER_EMAIL = "X-Auth-User-Email";
    public static final String HEADER_ROLES = "X-Auth-Roles";
    public static final String HEADER_COMPANY_ID = "X-Auth-Company-Id";
    public static final String HEADER_CORRELATION_ID = "X-Correlation-Id";

    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String AUTH_HEADER = "Authorization";
}
