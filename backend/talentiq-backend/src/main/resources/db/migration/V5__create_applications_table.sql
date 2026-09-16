-- ============================================================
-- V5: Job Applications and Status History
-- ============================================================

CREATE TABLE IF NOT EXISTS job_applications (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    job_id              BIGINT          NOT NULL,
    candidate_id        BIGINT          NOT NULL,
    resume_id           BIGINT,                     -- Snapshot at application time
    status              VARCHAR(30)     NOT NULL DEFAULT 'APPLIED',   -- ApplicationStatus enum
    cover_letter        TEXT,
    ai_match_score      DECIMAL(5, 2),              -- 0.00 to 100.00
    ai_match_details    JSON,                       -- Detailed breakdown
    recruiter_notes     TEXT,                       -- Internal HR notes
    interview_date      TIMESTAMP,
    offer_date          DATE,
    offer_amount        DECIMAL(12, 2),
    offer_currency      VARCHAR(10)     DEFAULT 'USD',
    rejection_reason    TEXT,
    applied_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_job_applications_job_candidate (job_id, candidate_id),
    INDEX idx_job_applications_job_id (job_id),
    INDEX idx_job_applications_candidate_id (candidate_id),
    INDEX idx_job_applications_status (status),
    INDEX idx_job_applications_applied_at (applied_at),
    INDEX idx_job_applications_ai_match_score (ai_match_score),
    CONSTRAINT fk_job_applications_job_id FOREIGN KEY (job_id)
        REFERENCES jobs (id) ON DELETE CASCADE,
    CONSTRAINT fk_job_applications_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Application Status History ────────────────────────────────
-- Immutable audit trail of all status changes.
CREATE TABLE IF NOT EXISTS application_status_history (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    application_id      BIGINT          NOT NULL,
    from_status         VARCHAR(30),
    to_status           VARCHAR(30)     NOT NULL,
    changed_by          BIGINT,                     -- user_id who made the change
    notes               TEXT,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_app_status_history_application_id (application_id),
    INDEX idx_app_status_history_created_at (created_at),
    CONSTRAINT fk_app_status_history_application_id FOREIGN KEY (application_id)
        REFERENCES job_applications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── AI Job Recommendations Cache ──────────────────────────────
CREATE TABLE IF NOT EXISTS job_recommendations (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id        BIGINT          NOT NULL,
    job_id              BIGINT          NOT NULL,
    overall_score       DECIMAL(5, 2)   NOT NULL,   -- 0.00 to 100.00
    skill_score         DECIMAL(5, 2),
    experience_score    DECIMAL(5, 2),
    education_score     DECIMAL(5, 2),
    location_score      DECIMAL(5, 2),
    semantic_score      DECIMAL(5, 2),
    matching_skills     JSON,                       -- Array of matching skill names
    missing_skills      JSON,                       -- Array of missing skill names
    strengths           JSON,                       -- Array of candidate strength strings
    improvement_suggestions JSON,
    score_details       JSON,                       -- Full breakdown
    computed_at         TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expires_at          TIMESTAMP       NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_job_recommendations_candidate_job (candidate_id, job_id),
    INDEX idx_job_recommendations_candidate_id (candidate_id),
    INDEX idx_job_recommendations_job_id (job_id),
    INDEX idx_job_recommendations_overall_score (overall_score),
    INDEX idx_job_recommendations_expires_at (expires_at),
    CONSTRAINT fk_job_recommendations_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE,
    CONSTRAINT fk_job_recommendations_job_id FOREIGN KEY (job_id)
        REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
