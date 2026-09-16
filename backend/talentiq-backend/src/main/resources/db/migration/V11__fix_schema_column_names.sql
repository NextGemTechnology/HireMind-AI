-- ============================================================
-- V11: Schema corrections — align all entity column names with JPA
-- ============================================================

-- ── Fix 1: analytics_events ──────────────────────────────────
-- Entity uses: properties_json  | DB has: properties
ALTER TABLE analytics_events
    CHANGE COLUMN properties properties_json JSON;

-- ── Fix 2: hr_analytics_snapshots ────────────────────────────
-- Entity uses completely different columns from V10 migration.
-- Rebuilding to match HrAnalyticsSnapshot entity exactly.
DROP TABLE IF EXISTS hr_analytics_snapshots;

CREATE TABLE hr_analytics_snapshots (
    id                          BIGINT          NOT NULL AUTO_INCREMENT,
    company_id                  BIGINT          NOT NULL,
    snapshot_date               DATE            NOT NULL,
    active_jobs_count           INT             NOT NULL DEFAULT 0,
    total_applications_count    INT             NOT NULL DEFAULT 0,
    hires_count                 INT             NOT NULL DEFAULT 0,
    avg_time_to_hire_days       DECIMAL(5, 2),
    conversion_rate             DECIMAL(5, 2),
    top_skills_in_demand        JSON,
    created_at                  TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_hr_analytics_snapshots_company_date (company_id, snapshot_date),
    INDEX idx_hr_analytics_snapshots_company_id (company_id),
    INDEX idx_hr_analytics_snapshots_date (snapshot_date),
    CONSTRAINT fk_hr_analytics_snapshots_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Fix 3: portfolios table ───────────────────────────────────
-- The V7 migration created a CMS-style portfolio schema.
-- The Portfolio entity has a simpler project-showcase schema.
-- Rebuilding to match Portfolio entity.
DROP TABLE IF EXISTS portfolio_sections;
DROP TABLE IF EXISTS portfolio_blogs;
DROP TABLE IF EXISTS portfolio_themes;
DROP TABLE IF EXISTS portfolios;

CREATE TABLE portfolios (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    project_url     VARCHAR(500),
    github_url      VARCHAR(500),
    thumbnail_url   VARCHAR(500),
    media_urls      JSON,
    is_featured     TINYINT(1)      NOT NULL DEFAULT 0,
    display_order   INT             NOT NULL DEFAULT 0,
    views_count     INT             NOT NULL DEFAULT 0,
    likes_count     INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),

    PRIMARY KEY (id),
    INDEX idx_portfolios_candidate_id (candidate_id),
    INDEX idx_portfolios_is_featured (is_featured),
    INDEX idx_portfolios_category (category),
    CONSTRAINT fk_portfolios_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Fix 4: portfolio_items table ──────────────────────────────
-- PortfolioItem entity maps to 'portfolio_items' which didn't exist.
CREATE TABLE IF NOT EXISTS portfolio_items (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    portfolio_id    BIGINT          NOT NULL,
    media_type      VARCHAR(30)     NOT NULL,
    media_url       VARCHAR(500)    NOT NULL,
    caption         VARCHAR(255),
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_portfolio_items_portfolio_id (portfolio_id),
    CONSTRAINT fk_portfolio_items_portfolio FOREIGN KEY (portfolio_id)
        REFERENCES portfolios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Fix 5: notifications table ────────────────────────────────
-- Entity uses: link_url  | DB has: action_url
ALTER TABLE notifications
    CHANGE COLUMN action_url link_url VARCHAR(500);

-- ── Fix 6: notification_preferences table ────────────────────
-- Check and create if missing (NotificationPreferences entity)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id                              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                         BIGINT          NOT NULL,
    email_notifications_enabled     TINYINT(1)      NOT NULL DEFAULT 1,
    in_app_enabled                  TINYINT(1)      NOT NULL DEFAULT 1,
    marketing_enabled               TINYINT(1)      NOT NULL DEFAULT 0,
    job_alerts_enabled              TINYINT(1)      NOT NULL DEFAULT 1,
    created_at                      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at                      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_notification_preferences_user_id (user_id),
    CONSTRAINT fk_notification_prefs_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Fix 7: ai_copilot_config table ───────────────────────────
-- Check and create if missing (AiCopilotConfig entity)
CREATE TABLE IF NOT EXISTS ai_copilot_config (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    hr_id                   BIGINT          NOT NULL,
    preferred_model         VARCHAR(100)    NOT NULL DEFAULT 'gpt-4o',
    system_prompt           TEXT,
    temperature             DECIMAL(3,2)    NOT NULL DEFAULT 0.70,
    enable_memory           TINYINT(1)      NOT NULL DEFAULT 1,
    memory_window           INT             NOT NULL DEFAULT 20,
    enable_rag              TINYINT(1)      NOT NULL DEFAULT 1,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_ai_copilot_config_hr_id (hr_id),
    CONSTRAINT fk_ai_copilot_config_hr FOREIGN KEY (hr_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
