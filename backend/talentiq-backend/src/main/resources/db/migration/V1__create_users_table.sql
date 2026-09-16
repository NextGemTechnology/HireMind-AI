-- ============================================================
-- V1: Create Users, User Roles, and Refresh Tokens tables
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id                                  BIGINT          NOT NULL AUTO_INCREMENT,
    email                               VARCHAR(255)    NOT NULL,
    password_hash                       VARCHAR(255)    NOT NULL,
    first_name                          VARCHAR(100)    NOT NULL,
    last_name                           VARCHAR(100)    NOT NULL,
    phone                               VARCHAR(20),
    avatar_url                          VARCHAR(500),
    status                              VARCHAR(30)     NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified                      BOOLEAN         NOT NULL DEFAULT FALSE,
    email_verification_token            VARCHAR(255),
    email_verification_token_expires_at TIMESTAMP,
    password_reset_token                VARCHAR(255),
    password_reset_token_expires_at     TIMESTAMP,
    last_login_at                       TIMESTAMP,
    login_attempts                      INT             NOT NULL DEFAULT 0,
    locked_until                        TIMESTAMP,
    created_at                          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at                          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by                          VARCHAR(255),
    updated_by                          VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    INDEX idx_users_status (status),
    INDEX idx_users_created_at (created_at),
    INDEX idx_users_email_verification_token (email_verification_token),
    INDEX idx_users_password_reset_token (password_reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── User Roles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT      NOT NULL,
    role    VARCHAR(30) NOT NULL,

    PRIMARY KEY (user_id, role),
    INDEX idx_user_roles_user_id (user_id),
    CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Refresh Tokens ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    user_id     BIGINT          NOT NULL,
    token       VARCHAR(500)    NOT NULL,
    expires_at  TIMESTAMP       NOT NULL,
    revoked     BOOLEAN         NOT NULL DEFAULT FALSE,
    user_agent  VARCHAR(500),
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_tokens_token (token(255)),
    INDEX idx_refresh_tokens_user_id (user_id),
    INDEX idx_refresh_tokens_expires_at (expires_at),
    CONSTRAINT fk_refresh_tokens_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Default Super Admin ────────────────────────────────────────
-- Password: Admin@123! (BCrypt strength 12) — MUST be changed on first login
INSERT INTO users (email, password_hash, first_name, last_name, status, email_verified, created_by)
VALUES (
    'admin@talentiq.ai',
    '$2a$12$9Vkb8VGPX9mKHLGy3iJJHePiEJAA9BTGexFc2zNNe1/p.qqt24XCG',
    'Platform',
    'Admin',
    'ACTIVE',
    TRUE,
    'SYSTEM'
);

INSERT INTO user_roles (user_id, role)
VALUES (LAST_INSERT_ID(), 'ROLE_SUPER_ADMIN');
