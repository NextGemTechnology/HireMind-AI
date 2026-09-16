-- ============================================================
-- V8: Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL,
    type            VARCHAR(50)     NOT NULL,    -- NotificationType enum
    title           VARCHAR(300)    NOT NULL,
    message         TEXT            NOT NULL,
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    action_url      VARCHAR(500),               -- Deep link to relevant page
    metadata        JSON,                       -- Type-specific data (jobId, applicationId, etc.)
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    read_at         TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_created_at (created_at),
    CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── User Settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
    id                          BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                     BIGINT          NOT NULL,
    -- Notification preferences
    email_notifications         BOOLEAN         NOT NULL DEFAULT TRUE,
    push_notifications          BOOLEAN         NOT NULL DEFAULT TRUE,
    notification_frequency      VARCHAR(20)     NOT NULL DEFAULT 'INSTANT',  -- INSTANT, DAILY, WEEKLY
    -- Job preferences
    preferred_job_types         JSON,           -- Array of JobType
    preferred_locations         JSON,           -- Array of location strings
    preferred_salary_min        DECIMAL(12, 2),
    open_to_relocation          BOOLEAN         NOT NULL DEFAULT FALSE,
    -- UI preferences
    theme                       VARCHAR(10)     NOT NULL DEFAULT 'dark',
    language                    VARCHAR(10)     NOT NULL DEFAULT 'en',
    dashboard_layout            JSON,
    -- Privacy
    profile_visibility          VARCHAR(20)     NOT NULL DEFAULT 'PUBLIC',   -- PUBLIC, RECRUITERS_ONLY, PRIVATE
    show_profile_in_search      BOOLEAN         NOT NULL DEFAULT TRUE,
    updated_at                  TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_user_settings_user_id (user_id),
    CONSTRAINT fk_user_settings_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
