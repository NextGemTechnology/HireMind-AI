-- ============================================================
-- V13: Job Recommendations Performance Indexes
-- Adds composite indexes for fast sorted pagination by score
-- ============================================================

-- ── 1. Composite Index for Candidate Recommendation Feed ─────
-- Accelerates query: WHERE candidate_id = :id AND expires_at > NOW() ORDER BY overall_score DESC
CREATE INDEX idx_job_recs_cand_expires_score 
    ON job_recommendations (candidate_id, expires_at, overall_score);

-- ── 2. Composite Index for HR Job Candidate Matches ───────────
-- Accelerates query: WHERE job_id = :id AND expires_at > NOW() ORDER BY overall_score DESC
CREATE INDEX idx_job_recs_job_expires_score 
    ON job_recommendations (job_id, expires_at, overall_score);
