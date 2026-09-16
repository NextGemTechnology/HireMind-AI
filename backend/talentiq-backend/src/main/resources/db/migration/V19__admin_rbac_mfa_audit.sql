-- ============================================================
-- V19: Admin RBAC, MFA, Audit Logs & Session Management
-- ============================================================

-- 1. Audit Logs (append-only action tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    session_id VARCHAR(128),
    result VARCHAR(20) DEFAULT 'SUCCESS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_actor_id (actor_user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_resource (resource_type, resource_id),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Admin Sessions (single-session enforcement for SuperAdmin)
CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    ip_address VARCHAR(45),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_admin_session_user_id (user_id),
    INDEX idx_admin_session_active (is_active),
    INDEX idx_admin_session_expires (expires_at),
    UNIQUE INDEX idx_admin_session_token (session_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. MFA / TOTP Configuration
CREATE TABLE IF NOT EXISTS mfa_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    totp_secret VARCHAR(500) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    backup_codes JSON,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_mfa_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Rename management_team_credentials → service_team_credentials
-- (Create new table if not exists, migrate data, then remove old)
CREATE TABLE IF NOT EXISTS service_team_credentials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'ROLE_SERVICE_TEAM',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT TRUE,
    password_reset_otp VARCHAR(10),
    password_reset_otp_expires_at TIMESTAMP,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    INDEX idx_svc_team_cred_email (email),
    INDEX idx_svc_team_cred_user_id (user_id),
    INDEX idx_svc_team_cred_status (status),
    INDEX idx_svc_team_cred_locked_until (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrate existing data from management_team_credentials to service_team_credentials
INSERT IGNORE INTO service_team_credentials
    (user_id, email, password_hash, role, status, email_verified,
     password_reset_otp, password_reset_otp_expires_at, login_attempts,
     locked_until, last_login_at, created_at, updated_at, created_by, updated_by)
SELECT
    user_id, email, password_hash, 'ROLE_SERVICE_TEAM', status, email_verified,
    password_reset_otp, password_reset_otp_expires_at, login_attempts,
    locked_until, last_login_at, created_at, updated_at, created_by, updated_by
FROM management_team_credentials;

-- 5. Update user_roles: ROLE_MANAGEMENT_TEAM → ROLE_SERVICE_TEAM
UPDATE user_roles SET role = 'ROLE_SERVICE_TEAM' WHERE role = 'ROLE_MANAGEMENT_TEAM';

-- 6. Add last_seen_at to users table
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP NULL;

-- 7. Add subscription_status to companies table
ALTER TABLE companies ADD COLUMN subscription_status VARCHAR(30) DEFAULT 'PENDING_VERIFICATION';
ALTER TABLE companies ADD COLUMN registered_by_user_id BIGINT NULL;
