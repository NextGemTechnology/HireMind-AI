-- ============================================================
-- V2: Candidate profile and all sub-tables
-- ============================================================

CREATE TABLE IF NOT EXISTS candidates (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL,
    headline            VARCHAR(200),
    bio                 TEXT,
    location            VARCHAR(150),
    github_url          VARCHAR(500),
    linkedin_url        VARCHAR(500),
    website_url         VARCHAR(500),
    years_experience    INT             DEFAULT 0,
    current_title       VARCHAR(150),
    current_company     VARCHAR(150),
    expected_salary     DECIMAL(12, 2),
    availability        VARCHAR(50),     -- IMMEDIATE, 2_WEEKS, 1_MONTH, etc.
    experience_level    VARCHAR(20),     -- ENTRY, JUNIOR, MID, SENIOR, LEAD, PRINCIPAL
    is_open_to_work     BOOLEAN         NOT NULL DEFAULT TRUE,
    profile_completion  INT             NOT NULL DEFAULT 0, -- 0-100 percentage
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_candidates_user_id (user_id),
    INDEX idx_candidates_location (location),
    INDEX idx_candidates_experience_level (experience_level),
    INDEX idx_candidates_is_open_to_work (is_open_to_work),
    INDEX idx_candidates_created_at (created_at),
    CONSTRAINT fk_candidates_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Skills ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_skills (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    skill_name      VARCHAR(100)    NOT NULL,
    proficiency     VARCHAR(20)     NOT NULL DEFAULT 'INTERMEDIATE',  -- SkillProficiency enum
    years           INT             DEFAULT 0,
    is_primary      BOOLEAN         NOT NULL DEFAULT FALSE,
    display_order   INT             NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    INDEX idx_candidate_skills_candidate_id (candidate_id),
    INDEX idx_candidate_skills_skill_name (skill_name),
    INDEX idx_candidate_skills_is_primary (is_primary),
    UNIQUE KEY uk_candidate_skills_candidate_skill (candidate_id, skill_name),
    CONSTRAINT fk_candidate_skills_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Experiences ────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_experiences (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    company         VARCHAR(150)    NOT NULL,
    title           VARCHAR(150)    NOT NULL,
    description     TEXT,
    location        VARCHAR(150),
    employment_type VARCHAR(30),     -- FULL_TIME, PART_TIME, CONTRACT, etc.
    start_date      DATE            NOT NULL,
    end_date        DATE,
    is_current      BOOLEAN         NOT NULL DEFAULT FALSE,
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_candidate_experiences_candidate_id (candidate_id),
    INDEX idx_candidate_experiences_is_current (is_current),
    CONSTRAINT fk_candidate_experiences_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Educations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_educations (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    institution     VARCHAR(200)    NOT NULL,
    degree          VARCHAR(150),
    field_of_study  VARCHAR(150),
    gpa             DECIMAL(4, 2),
    start_date      DATE,
    end_date        DATE,
    is_current      BOOLEAN         NOT NULL DEFAULT FALSE,
    description     TEXT,
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_candidate_educations_candidate_id (candidate_id),
    CONSTRAINT fk_candidate_educations_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Projects ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_projects (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    url             VARCHAR(500),
    github_url      VARCHAR(500),
    tech_stack      JSON,           -- Array of technology strings
    start_date      DATE,
    end_date        DATE,
    is_featured     BOOLEAN         NOT NULL DEFAULT FALSE,
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_candidate_projects_candidate_id (candidate_id),
    INDEX idx_candidate_projects_is_featured (is_featured),
    CONSTRAINT fk_candidate_projects_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Certifications ─────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_certifications (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    name            VARCHAR(200)    NOT NULL,
    issuer          VARCHAR(150),
    credential_id   VARCHAR(150),
    credential_url  VARCHAR(500),
    issue_date      DATE,
    expiry_date     DATE,
    does_not_expire BOOLEAN         NOT NULL DEFAULT FALSE,
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_candidate_certifications_candidate_id (candidate_id),
    CONSTRAINT fk_candidate_certifications_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Languages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_languages (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    language        VARCHAR(100)    NOT NULL,
    proficiency     VARCHAR(30)     NOT NULL DEFAULT 'CONVERSATIONAL', -- NATIVE, FLUENT, CONVERSATIONAL, BASIC
    display_order   INT             NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    INDEX idx_candidate_languages_candidate_id (candidate_id),
    UNIQUE KEY uk_candidate_language (candidate_id, language),
    CONSTRAINT fk_candidate_languages_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Achievements ───────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_achievements (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    achievement_date DATE,
    url             VARCHAR(500),
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_candidate_achievements_candidate_id (candidate_id),
    CONSTRAINT fk_candidate_achievements_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidate Embeddings ─────────────────────────────────────
-- Stores vector embeddings for semantic search.
-- Uses JSON for Phase 1 (MySQL). Migrate to pgvector in Phase 2.
CREATE TABLE IF NOT EXISTS candidate_embeddings (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    embedding_json  LONGTEXT        NOT NULL,   -- Float array as JSON
    model           VARCHAR(100)    NOT NULL DEFAULT 'text-embedding-3-small',
    content_hash    VARCHAR(64)     NOT NULL,   -- SHA-256 of embedded content
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_candidate_embeddings_candidate_id (candidate_id),
    INDEX idx_candidate_embeddings_content_hash (content_hash),
    CONSTRAINT fk_candidate_embeddings_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
