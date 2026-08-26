-- ============================================================
-- V14: Separate Role-Specific Credential Tables
-- Complete isolation of credentials across roles:
--   1. user_credentials (Candidate / User)
--   2. hr_credentials (HR Recruiter)
--   3. company_credentials (Company Executive / CEO / Director)
--   4. app_dev_credentials (Application Developer)
--   5. management_team_credentials (Platform Management Team)
-- ============================================================

-- ── 1. Candidate / User Credentials Table ─────────────────────
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

-- ── 2. HR Recruiter Credentials Table ─────────────────────────
CREATE TABLE IF NOT EXISTS hr_credentials (
    id                              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                         BIGINT          NOT NULL,
    email                           VARCHAR(255)    NOT NULL,
    password_hash                   VARCHAR(255)    NOT NULL,
    role                            VARCHAR(30)     NOT NULL DEFAULT 'ROLE_HR',
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
    UNIQUE KEY uk_hr_cred_email (email),
    UNIQUE KEY uk_hr_cred_user_id (user_id),
    INDEX idx_hr_cred_status (status),
    INDEX idx_hr_cred_locked_until (locked_until),
    INDEX idx_hr_cred_created_at (created_at),
    CONSTRAINT fk_hr_cred_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Company Admin / Executive Credentials Table ────────────
CREATE TABLE IF NOT EXISTS company_credentials (
    id                              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                         BIGINT          NOT NULL,
    email                           VARCHAR(255)    NOT NULL,
    password_hash                   VARCHAR(255)    NOT NULL,
    role                            VARCHAR(30)     NOT NULL DEFAULT 'ROLE_COMPANY_ADMIN',
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
    UNIQUE KEY uk_comp_cred_email (email),
    UNIQUE KEY uk_comp_cred_user_id (user_id),
    INDEX idx_comp_cred_status (status),
    INDEX idx_comp_cred_locked_until (locked_until),
    INDEX idx_comp_cred_created_at (created_at),
    CONSTRAINT fk_comp_cred_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Application Developer Credentials Table ────────────────
CREATE TABLE IF NOT EXISTS app_dev_credentials (
    id                              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                         BIGINT          NOT NULL,
    email                           VARCHAR(255)    NOT NULL,
    password_hash                   VARCHAR(255)    NOT NULL,
    role                            VARCHAR(30)     NOT NULL DEFAULT 'ROLE_APP_DEVELOPER',
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
    UNIQUE KEY uk_app_dev_cred_email (email),
    UNIQUE KEY uk_app_dev_cred_user_id (user_id),
    INDEX idx_app_dev_cred_status (status),
    INDEX idx_app_dev_cred_locked_until (locked_until),
    INDEX idx_app_dev_cred_created_at (created_at),
    CONSTRAINT fk_app_dev_cred_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Platform Management Team Credentials Table ─────────────
CREATE TABLE IF NOT EXISTS management_team_credentials (
    id                              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                         BIGINT          NOT NULL,
    email                           VARCHAR(255)    NOT NULL,
    password_hash                   VARCHAR(255)    NOT NULL,
    role                            VARCHAR(30)     NOT NULL DEFAULT 'ROLE_MANAGEMENT_TEAM',
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
    UNIQUE KEY uk_mgmt_cred_email (email),
    UNIQUE KEY uk_mgmt_cred_user_id (user_id),
    INDEX idx_mgmt_cred_status (status),
    INDEX idx_mgmt_cred_locked_until (locked_until),
    INDEX idx_mgmt_cred_created_at (created_at),
    CONSTRAINT fk_mgmt_cred_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Backfill Data from users + user_roles ──────────────────
INSERT IGNORE INTO user_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT u.id, u.email, u.password_hash, 'ROLE_CANDIDATE', u.status, u.email_verified, u.password_reset_token, u.password_reset_token_expires_at, u.login_attempts, u.locked_until, u.last_login_at, u.created_at, u.updated_at
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'ROLE_CANDIDATE';

INSERT IGNORE INTO hr_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT u.id, u.email, u.password_hash, 'ROLE_HR', u.status, u.email_verified, u.password_reset_token, u.password_reset_token_expires_at, u.login_attempts, u.locked_until, u.last_login_at, u.created_at, u.updated_at
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'ROLE_HR';

INSERT IGNORE INTO company_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT u.id, u.email, u.password_hash, 'ROLE_COMPANY_ADMIN', u.status, u.email_verified, u.password_reset_token, u.password_reset_token_expires_at, u.login_attempts, u.locked_until, u.last_login_at, u.created_at, u.updated_at
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'ROLE_COMPANY_ADMIN';

INSERT IGNORE INTO app_dev_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT u.id, u.email, u.password_hash, 'ROLE_APP_DEVELOPER', u.status, u.email_verified, u.password_reset_token, u.password_reset_token_expires_at, u.login_attempts, u.locked_until, u.last_login_at, u.created_at, u.updated_at
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'ROLE_APP_DEVELOPER';

INSERT IGNORE INTO management_team_credentials (user_id, email, password_hash, role, status, email_verified, password_reset_otp, password_reset_otp_expires_at, login_attempts, locked_until, last_login_at, created_at, updated_at)
SELECT u.id, u.email, u.password_hash, 'ROLE_MANAGEMENT_TEAM', u.status, u.email_verified, u.password_reset_token, u.password_reset_token_expires_at, u.login_attempts, u.locked_until, u.last_login_at, u.created_at, u.updated_at
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'ROLE_MANAGEMENT_TEAM';
