-- ============================================================
-- V6: Resume Upload, Versions, and Parsed Data
-- ============================================================

CREATE TABLE IF NOT EXISTS resumes (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    version_name    VARCHAR(100)    NOT NULL DEFAULT 'Default',
    original_name   VARCHAR(255)    NOT NULL,
    file_url        VARCHAR(1000)   NOT NULL,
    file_type       VARCHAR(100)    NOT NULL,    -- MIME type
    file_size_bytes BIGINT          NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,   -- Current/primary version
    is_parsed       BOOLEAN         NOT NULL DEFAULT FALSE,
    parse_status    VARCHAR(20)     NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, DONE, FAILED
    parse_error     TEXT,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),

    PRIMARY KEY (id),
    INDEX idx_resumes_candidate_id (candidate_id),
    INDEX idx_resumes_is_active (is_active),
    INDEX idx_resumes_is_parsed (is_parsed),
    INDEX idx_resumes_created_at (created_at),
    CONSTRAINT fk_resumes_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Parsed Resume Data ────────────────────────────────────────
-- Stores AI-extracted structured data from each resume.
CREATE TABLE IF NOT EXISTS resume_parsed_data (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    resume_id           BIGINT          NOT NULL,
    raw_text            LONGTEXT,                       -- Full extracted text
    extracted_skills    JSON,                           -- Array of skill objects
    extracted_experience JSON,                          -- Array of experience objects
    extracted_education JSON,                           -- Array of education objects
    extracted_projects  JSON,                           -- Array of project objects
    extracted_certifications JSON,
    extracted_languages JSON,
    extracted_summary   TEXT,
    extracted_name      VARCHAR(200),
    extracted_email     VARCHAR(255),
    extracted_phone     VARCHAR(50),
    extracted_location  VARCHAR(200),
    extracted_github    VARCHAR(500),
    extracted_linkedin  VARCHAR(500),
    years_of_experience INT,
    ai_resume_score     DECIMAL(5, 2),                  -- AI-computed quality score
    ai_recommendations  JSON,                           -- Improvement suggestions
    parser_model        VARCHAR(100),                   -- Which AI model parsed it
    parsed_at           TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_resume_parsed_data_resume_id (resume_id),
    CONSTRAINT fk_resume_parsed_data_resume_id FOREIGN KEY (resume_id)
        REFERENCES resumes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── File Metadata ─────────────────────────────────────────────
-- Track all uploaded files with storage provider reference.
CREATE TABLE IF NOT EXISTS file_metadata (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    owner_id        BIGINT,                         -- user_id who owns the file
    original_name   VARCHAR(255)    NOT NULL,
    stored_name     VARCHAR(255)    NOT NULL,
    file_url        VARCHAR(1000)   NOT NULL,
    file_type       VARCHAR(100)    NOT NULL,
    file_size_bytes BIGINT          NOT NULL,
    storage_provider VARCHAR(20)   NOT NULL DEFAULT 'local',   -- local | s3
    storage_path    VARCHAR(1000)   NOT NULL,
    content_type    VARCHAR(100),
    entity_type     VARCHAR(50),                    -- RESUME, AVATAR, LOGO, etc.
    entity_id       BIGINT,
    is_public       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_file_metadata_owner_id (owner_id),
    INDEX idx_file_metadata_entity_type_id (entity_type, entity_id),
    INDEX idx_file_metadata_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
