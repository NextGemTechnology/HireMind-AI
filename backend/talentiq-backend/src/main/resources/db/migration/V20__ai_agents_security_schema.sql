-- ============================================================
-- V20: AI Security Gateway, User Preferences & Schema Extensions
-- ============================================================

-- ── 1. AI Security Events (Audit log for AI Gateway detections & abuse) ──────
CREATE TABLE IF NOT EXISTS ai_security_events (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL,
    event_type          VARCHAR(50)     NOT NULL, -- PROMPT_INJECTION, MIME_MISMATCH, HIDDEN_TEXT_ALERT, RATE_LIMITED, QUOTA_EXCEEDED, USER_BLOCKED, PII_DETECTED
    input_sample        VARCHAR(500),             -- Sanitized first 200-500 chars (no PII/secrets)
    detection_pattern   VARCHAR(200),             -- Name/identifier of triggered rule
    severity            VARCHAR(20)     NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    ip_address          VARCHAR(45),
    metadata            JSON,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_ai_sec_user (user_id),
    INDEX idx_ai_sec_type (event_type),
    INDEX idx_ai_sec_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. AI User Preferences (Opt-in/out for chat storage, retention policy) ──
CREATE TABLE IF NOT EXISTS ai_user_preferences (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT          NOT NULL,
    chat_storage_enabled    BOOLEAN         NOT NULL DEFAULT TRUE,
    retention_days          INT             NOT NULL DEFAULT 90,
    data_sharing_consent    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_ai_user_preferences_user_id (user_id),
    INDEX idx_ai_user_preferences_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Extend ai_conversations for Candidate Career Agent Support ─────────────
ALTER TABLE ai_conversations
    ADD COLUMN user_type VARCHAR(20) NOT NULL DEFAULT 'HR' AFTER hr_id,
    ADD COLUMN candidate_id BIGINT NULL AFTER user_type,
    ADD COLUMN chat_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER is_archived,
    MODIFY COLUMN hr_id BIGINT NULL,
    MODIFY COLUMN company_id BIGINT NULL,
    ADD INDEX idx_ai_conv_user_type (user_type),
    ADD INDEX idx_ai_conv_candidate_id (candidate_id);
