-- ============================================================
-- V10: Analytics Events and Audit Logs
-- ============================================================

-- ── Analytics Events ─────────────────────────────────────────
-- High-volume event stream. Consider partitioning by month in production.
CREATE TABLE IF NOT EXISTS analytics_events (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    event_type      VARCHAR(100)    NOT NULL,   -- JOB_VIEWED, JOB_APPLIED, PROFILE_VIEWED, etc.
    actor_id        BIGINT,                     -- user who performed the action
    actor_role      VARCHAR(30),
    entity_type     VARCHAR(50),               -- JOB, CANDIDATE, COMPANY, RESUME
    entity_id       BIGINT,
    company_id      BIGINT,
    session_id      VARCHAR(100),
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    referrer        VARCHAR(500),
    properties      JSON,                       -- Event-specific properties
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_analytics_events_event_type (event_type),
    INDEX idx_analytics_events_actor_id (actor_id),
    INDEX idx_analytics_events_entity (entity_type, entity_id),
    INDEX idx_analytics_events_company_id (company_id),
    INDEX idx_analytics_events_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Audit Logs ────────────────────────────────────────────────
-- Security and data audit trail. Immutable — never delete rows.
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT,
    user_email      VARCHAR(255),
    action          VARCHAR(100)    NOT NULL,   -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    entity_type     VARCHAR(100)    NOT NULL,
    entity_id       VARCHAR(100),
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    request_method  VARCHAR(10),
    request_path    VARCHAR(500),
    old_values      JSON,                       -- Before state
    new_values      JSON,                       -- After state
    status          VARCHAR(20)     NOT NULL DEFAULT 'SUCCESS',
    error_message   TEXT,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_created_at (created_at),
    INDEX idx_audit_logs_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── HR Analytics Snapshots ────────────────────────────────────
-- Pre-aggregated analytics for fast dashboard rendering.
-- Populated by scheduled jobs.
CREATE TABLE IF NOT EXISTS hr_analytics_snapshots (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    company_id              BIGINT          NOT NULL,
    hr_id                   BIGINT,
    snapshot_date           DATE            NOT NULL,
    period                  VARCHAR(20)     NOT NULL DEFAULT 'DAILY',  -- DAILY, WEEKLY, MONTHLY
    total_jobs_active       INT             NOT NULL DEFAULT 0,
    total_jobs_posted       INT             NOT NULL DEFAULT 0,
    total_applications      INT             NOT NULL DEFAULT 0,
    total_shortlisted       INT             NOT NULL DEFAULT 0,
    total_interviews        INT             NOT NULL DEFAULT 0,
    total_offers            INT             NOT NULL DEFAULT 0,
    total_hired             INT             NOT NULL DEFAULT 0,
    total_rejected          INT             NOT NULL DEFAULT 0,
    avg_time_to_hire_days   DECIMAL(8, 2),
    top_skills              JSON,           -- Array of top required skills
    top_job_titles          JSON,
    application_funnel      JSON,           -- Stage-by-stage funnel data
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_hr_analytics_company_date_period (company_id, snapshot_date, period),
    INDEX idx_hr_analytics_company_id (company_id),
    INDEX idx_hr_analytics_snapshot_date (snapshot_date),
    CONSTRAINT fk_hr_analytics_company_id FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Platform Analytics Snapshots ─────────────────────────────
CREATE TABLE IF NOT EXISTS platform_analytics_snapshots (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    snapshot_date           DATE            NOT NULL,
    period                  VARCHAR(20)     NOT NULL DEFAULT 'DAILY',
    total_users             BIGINT          NOT NULL DEFAULT 0,
    new_users               INT             NOT NULL DEFAULT 0,
    active_candidates       INT             NOT NULL DEFAULT 0,
    active_companies        INT             NOT NULL DEFAULT 0,
    active_jobs             INT             NOT NULL DEFAULT 0,
    total_applications      BIGINT          NOT NULL DEFAULT 0,
    total_resumes_parsed    INT             NOT NULL DEFAULT 0,
    total_ai_conversations  INT             NOT NULL DEFAULT 0,
    popular_skills          JSON,
    popular_locations       JSON,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_platform_analytics_date_period (snapshot_date, period),
    INDEX idx_platform_analytics_snapshot_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
