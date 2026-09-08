-- ============================================================
-- V20: Developer Workspace Tables and Access Control
-- ============================================================

-- 1. Add workspace_access column to employees table
ALTER TABLE employees ADD COLUMN workspace_access BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Developer Daily Standup Updates table
CREATE TABLE IF NOT EXISTS developer_daily_updates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    work_summary TEXT NOT NULL,
    blockers TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dev_update_user (user_id),
    INDEX idx_dev_update_company (company_id),
    INDEX idx_dev_update_submitted (submitted_at),
    CONSTRAINT fk_dev_update_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_dev_update_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
