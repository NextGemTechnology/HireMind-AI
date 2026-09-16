package com.talentiq.common.constants;

/**
 * Application-wide constants.
 * All magic strings and numbers live here.
 */
public final class AppConstants {

    private AppConstants() {}

    // ── API ───────────────────────────────────────────────────────────────────
    public static final String API_V1 = "/v1";
    public static final String API_V2 = "/v2";

    // ── Pagination ────────────────────────────────────────────────────────────
    public static final int DEFAULT_PAGE_NUMBER = 0;
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final String DEFAULT_SORT_FIELD = "createdAt";
    public static final String DEFAULT_SORT_DIRECTION = "DESC";

    // ── File Storage ──────────────────────────────────────────────────────────
    public static final long MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024L;  // 10 MB
    public static final long MAX_AVATAR_SIZE_BYTES  = 2 * 1024 * 1024L;  // 2 MB
    public static final String RESUME_SUBDIR  = "resumes";
    public static final String AVATAR_SUBDIR  = "avatars";
    public static final String LOGO_SUBDIR    = "logos";

    // ── Security ──────────────────────────────────────────────────────────────
    public static final String TOKEN_PREFIX   = "Bearer ";
    public static final String AUTH_HEADER    = "Authorization";
    public static final int BCRYPT_STRENGTH   = 12;
    public static final String SYSTEM_USER    = "SYSTEM";

    // ── Cache Keys ────────────────────────────────────────────────────────────
    public static final String CACHE_USER             = "users";
    public static final String CACHE_CANDIDATE        = "candidates";
    public static final String CACHE_JOBS             = "jobs";
    public static final String CACHE_COMPANY          = "companies";
    public static final String CACHE_RECOMMENDATIONS  = "recommendations";
    public static final String CACHE_PORTFOLIO        = "portfolios";

    // ── AI ────────────────────────────────────────────────────────────────────
    public static final int EMBEDDING_DIMENSION       = 1536;   // text-embedding-3-small
    public static final double SIMILARITY_THRESHOLD   = 0.65;
    public static final int MAX_COPILOT_MEMORY        = 20;     // messages per session

    // ── Validation ────────────────────────────────────────────────────────────
    public static final int MIN_PASSWORD_LENGTH       = 8;
    public static final int MAX_BIO_LENGTH            = 2000;
    public static final int MAX_TITLE_LENGTH          = 150;
    public static final int MAX_DESCRIPTION_LENGTH    = 10000;
}
