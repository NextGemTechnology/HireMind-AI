-- ============================================================
-- V12: Performance Optimization Indexes & Communication Tables
-- Adds composite and covering indexes for common query patterns
-- ============================================================

-- ── 1. Jobs Table Optimization ──────────────────────────────────
-- Optimizes active job feed query: status + expires_at + created_at
CREATE INDEX idx_jobs_status_expires_created 
    ON jobs (status, expires_at, created_at);

-- Optimizes company job management / dashboard filtering
CREATE INDEX idx_jobs_company_status 
    ON jobs (company_id, status);

-- ── 2. Job Applications Optimization ───────────────────────────
-- Optimizes recruiter applicant sorting by AI score & status for a job
CREATE INDEX idx_job_apps_job_status_score 
    ON job_applications (job_id, status, ai_match_score);

-- Optimizes candidate application history ordered by application date
CREATE INDEX idx_job_apps_candidate_applied 
    ON job_applications (candidate_id, applied_at);

-- ── 3. Candidate & Skills Optimization ──────────────────────────
-- Optimizes open-to-work candidate directory sorted by newest
CREATE INDEX idx_candidates_open_to_work_created 
    ON candidates (is_open_to_work, created_at);

-- Optimizes primary skills lookup per candidate
CREATE INDEX idx_candidate_skills_cand_primary 
    ON candidate_skills (candidate_id, is_primary);

-- ── 4. Notifications & User Activity ────────────────────────────
-- Optimizes unread notification badge counts & user notification feed
CREATE INDEX idx_notifications_user_read_created 
    ON notifications (user_id, is_read, created_at);

-- Optimizes active token lookups & bulk revocation per user
CREATE INDEX idx_refresh_tokens_user_revoked 
    ON refresh_tokens (user_id, revoked);

-- Optimizes active resume lookup for candidate profile & application flows
CREATE INDEX idx_resumes_candidate_active 
    ON resumes (candidate_id, is_active);

-- ── 5. Analytics & Audit Logging ───────────────────────────────
-- Optimizes metric aggregations by event type across time ranges
CREATE INDEX idx_analytics_events_type_created 
    ON analytics_events (event_type, created_at);

-- Optimizes user audit trail and security history lookups
CREATE INDEX idx_audit_logs_user_created 
    ON audit_logs (user_id, created_at);

-- ── 6. Chat & Interview Tables & Scheduling Indexes ────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    sender_name VARCHAR(200) NOT NULL,
    receiver_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chat_msg_sender (sender_id),
    INDEX idx_chat_msg_receiver (receiver_id),
    INDEX idx_chat_msg_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interview_slots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    hr_user_id BIGINT NOT NULL,
    hr_name VARCHAR(200) NOT NULL,
    candidate_user_id BIGINT NOT NULL,
    candidate_name VARCHAR(200) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    meeting_link VARCHAR(500),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_interview_hr_user_id (hr_user_id),
    INDEX idx_interview_candidate_user_id (candidate_user_id),
    INDEX idx_interview_application_id (application_id),
    INDEX idx_interview_scheduled_at (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optimizes direct messaging thread queries between two users
CREATE INDEX idx_chat_msg_pair_sent 
    ON chat_messages (sender_id, receiver_id, sent_at);

-- Optimizes HR interview scheduling & calendar timeline lookups
CREATE INDEX idx_interview_hr_status_scheduled 
    ON interview_slots (hr_user_id, status, scheduled_at);
