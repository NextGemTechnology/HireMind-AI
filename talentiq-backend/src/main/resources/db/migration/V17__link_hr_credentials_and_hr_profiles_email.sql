-- ============================================================
-- V17: Link HR Credentials to HR Profiles and Add Email Field
-- ============================================================

-- ── 1. Add email column to hr_profiles table ────────────────
ALTER TABLE hr_profiles 
    ADD COLUMN email VARCHAR(255) NULL AFTER user_id,
    ADD INDEX idx_hr_profiles_email (email);

-- ── 2. Add hr_profile_id to hr_credentials table ────────────
ALTER TABLE hr_credentials
    ADD COLUMN hr_profile_id BIGINT NULL AFTER user_id,
    ADD CONSTRAINT fk_hr_cred_hr_profile FOREIGN KEY (hr_profile_id)
        REFERENCES hr_profiles (id) ON DELETE CASCADE;

-- ── 3. Backfill hr_profiles.email from users.email ──────────
UPDATE hr_profiles hp
INNER JOIN users u ON hp.user_id = u.id
SET hp.email = u.email
WHERE hp.email IS NULL;

-- ── 4. Backfill hr_credentials.hr_profile_id from hr_profiles 
UPDATE hr_credentials hc
INNER JOIN hr_profiles hp ON hc.user_id = hp.user_id
SET hc.hr_profile_id = hp.id
WHERE hc.hr_profile_id IS NULL;

