-- ============================================================
-- V23: Employee Performance & Reviews System
-- ============================================================

-- Add tagline to companies
ALTER TABLE companies ADD COLUMN tagline VARCHAR(255) DEFAULT 'Innovating Tomorrow, Together';

-- ── Employee Performance Reviews Table ───────────────────────
CREATE TABLE IF NOT EXISTS employee_performance_reviews (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    company_id          BIGINT          NOT NULL,
    employee_id         BIGINT          NOT NULL,
    reviewer_user_id    BIGINT          NOT NULL,
    review_period       VARCHAR(50)     NOT NULL DEFAULT 'Q3 2026',
    rating              DECIMAL(3,2)    NOT NULL DEFAULT 4.50,
    rating_category     VARCHAR(30)     NOT NULL DEFAULT 'EXCELLENT',
    feedback            TEXT,
    goals_okrs          TEXT,
    reviewed_at         DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_perf_company (company_id),
    INDEX idx_perf_employee (employee_id),
    INDEX idx_perf_period (company_id, review_period),
    INDEX idx_perf_rating (company_id, rating_category),
    CONSTRAINT fk_perf_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
