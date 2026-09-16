-- ============================================================
-- V18: Decouple HR Profiles and HR Credentials from Users Table
-- ============================================================

-- ── 1. Enhance hr_profiles table with personal profile fields ─
ALTER TABLE hr_profiles
    ADD COLUMN first_name VARCHAR(100) NULL AFTER email,
    ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name,
    ADD COLUMN phone VARCHAR(30) NULL AFTER last_name,
    ADD COLUMN avatar_url VARCHAR(500) NULL AFTER phone,
    MODIFY COLUMN user_id BIGINT NULL;

-- ── 2. Make user_id nullable in hr_credentials ──────────────
ALTER TABLE hr_credentials
    MODIFY COLUMN user_id BIGINT NULL;

-- ── 3. Make user_id nullable in refresh_tokens ──────────────
ALTER TABLE refresh_tokens
    ADD COLUMN user_email VARCHAR(255) NULL AFTER user_id,
    MODIFY COLUMN user_id BIGINT NULL,
    ADD INDEX idx_refresh_tokens_email (user_email);

-- ── 4. Jobs & Verifications decoupled from mandatory users table ─
ALTER TABLE jobs
    ADD COLUMN hr_profile_id BIGINT NULL AFTER posted_by,
    MODIFY COLUMN posted_by BIGINT NULL;

ALTER TABLE company_candidate_verifications
    ADD COLUMN hr_profile_id BIGINT NULL AFTER hr_user_id,
    MODIFY COLUMN hr_user_id BIGINT NULL;

-- ── 5. Backfill personal details from users table if any ────
UPDATE hr_profiles hp
INNER JOIN users u ON hp.user_id = u.id
SET hp.first_name = u.first_name,
    hp.last_name = u.last_name,
    hp.phone = u.phone,
    hp.avatar_url = u.avatar_url,
    hp.email = u.email
WHERE hp.email IS NULL OR hp.first_name IS NULL;

