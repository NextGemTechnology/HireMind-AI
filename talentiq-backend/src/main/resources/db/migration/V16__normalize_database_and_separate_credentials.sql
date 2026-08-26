-- ============================================================
-- V16: Complete Database Security & Normalization Migration
-- 1. Unifies all authentication credentials into user_credentials
-- 2. Completely removes password and token columns from users profile table
-- 3. Establishes referential integrity and foreign keys
-- ============================================================

-- ── 1. Ensure user_credentials table exists and is indexed ──
CREATE TABLE IF NOT EXISTS user_credentials (
    id                              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                         BIGINT          NOT NULL,
    email                           VARCHAR(255)    NOT NULL,
    password_hash                   VARCHAR(255)    NOT NULL,
    role                            VARCHAR(30)     NOT NULL DEFAULT 'ROLE_CANDIDATE',
    status                          VARCHAR(30)     NOT NULL DEFAULT 'ACTIVE',
    email_verified                  BOOLEAN         NOT NULL DEFAULT TRUE,
    password_reset_otp              VARCHAR(10),
    password_reset_otp_expires_at   TIMESTAMP       NULL,
    login_attempts                  INT             NOT NULL DEFAULT 0,
    locked_until                    TIMESTAMP       NULL,
    last_login_at                   TIMESTAMP       NULL,
    created_at                      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at                      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by                      VARCHAR(255),
    updated_by                      VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_user_cred_email (email),
    UNIQUE KEY uk_user_cred_user_id (user_id),
    INDEX idx_user_cred_status (status),
    INDEX idx_user_cred_locked_until (locked_until),
    INDEX idx_user_cred_created_at (created_at),
    CONSTRAINT fk_user_cred_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Backfill/Migrate all credentials from role tables and users into user_credentials ──
INSERT IGNORE INTO user_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at FROM hr_credentials;

INSERT IGNORE INTO user_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at FROM company_credentials;

INSERT IGNORE INTO user_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at FROM app_dev_credentials;

INSERT IGNORE INTO user_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at FROM management_team_credentials;

-- ── 3. Drop all authentication and token columns from users table ──
ALTER TABLE users
    DROP COLUMN password_hash,
    DROP COLUMN password_reset_token,
    DROP COLUMN password_reset_token_expires_at,
    DROP COLUMN password_reset_otp,
    DROP COLUMN password_reset_otp_expires_at,
    DROP COLUMN email_verification_token,
    DROP COLUMN email_verification_token_expires_at,
    DROP COLUMN login_attempts,
    DROP COLUMN locked_until,
    DROP COLUMN last_login_at;

