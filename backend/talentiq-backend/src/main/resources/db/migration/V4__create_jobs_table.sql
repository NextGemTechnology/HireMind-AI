-- ============================================================
-- V4: Jobs and Job Skills
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    company_id          BIGINT          NOT NULL,
    posted_by           BIGINT          NOT NULL,   -- HR user_id
    title               VARCHAR(200)    NOT NULL,
    slug                VARCHAR(250)    NOT NULL,
    description         LONGTEXT        NOT NULL,
    responsibilities    TEXT,
    requirements        TEXT,
    job_type            VARCHAR(30)     NOT NULL DEFAULT 'FULL_TIME',   -- JobType enum
    location            VARCHAR(200),
    is_remote           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_hybrid           BOOLEAN         NOT NULL DEFAULT FALSE,
    salary_min          DECIMAL(12, 2),
    salary_max          DECIMAL(12, 2),
    salary_currency     VARCHAR(10)     NOT NULL DEFAULT 'USD',
    salary_period       VARCHAR(20)     NOT NULL DEFAULT 'YEARLY',      -- YEARLY, MONTHLY, HOURLY
    experience_level    VARCHAR(20)     NOT NULL DEFAULT 'MID',         -- ExperienceLevel enum
    status              VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',       -- JobStatus enum
    application_deadline DATE,
    expires_at          TIMESTAMP,
    openings            INT             NOT NULL DEFAULT 1,
    views_count         INT             NOT NULL DEFAULT 0,
    applications_count  INT             NOT NULL DEFAULT 0,
    embedding_json      LONGTEXT,                                       -- Job description embedding
    embedding_hash      VARCHAR(64),
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_jobs_slug (slug),
    INDEX idx_jobs_company_id (company_id),
    INDEX idx_jobs_posted_by (posted_by),
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_job_type (job_type),
    INDEX idx_jobs_experience_level (experience_level),
    INDEX idx_jobs_is_remote (is_remote),
    INDEX idx_jobs_location (location),
    INDEX idx_jobs_expires_at (expires_at),
    INDEX idx_jobs_created_at (created_at),
    FULLTEXT INDEX ft_jobs_search (title, description, location),
    CONSTRAINT fk_jobs_company_id FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_jobs_posted_by FOREIGN KEY (posted_by)
        REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Job Skills ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_skills (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    job_id          BIGINT          NOT NULL,
    skill_name      VARCHAR(100)    NOT NULL,
    is_required     BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   INT             NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    INDEX idx_job_skills_job_id (job_id),
    INDEX idx_job_skills_skill_name (skill_name),
    UNIQUE KEY uk_job_skills_job_skill (job_id, skill_name),
    CONSTRAINT fk_job_skills_job_id FOREIGN KEY (job_id)
        REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Saved Jobs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_jobs (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL,
    job_id          BIGINT          NOT NULL,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_saved_jobs_user_job (user_id, job_id),
    INDEX idx_saved_jobs_user_id (user_id),
    INDEX idx_saved_jobs_job_id (job_id),
    CONSTRAINT fk_saved_jobs_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_jobs_job_id FOREIGN KEY (job_id)
        REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
