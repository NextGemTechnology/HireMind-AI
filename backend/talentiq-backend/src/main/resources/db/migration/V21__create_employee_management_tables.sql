-- ============================================================
-- V21: Employee Management & Salary Disbursement System
-- ============================================================

-- ── Employees Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    company_id          BIGINT          NOT NULL,
    user_id             BIGINT          NOT NULL,
    hr_profile_id       BIGINT,
    employee_code       VARCHAR(50),
    job_title           VARCHAR(200)    NOT NULL,
    department          VARCHAR(100),
    employment_type     VARCHAR(30)     NOT NULL DEFAULT 'FULL_TIME',
    status              VARCHAR(30)     NOT NULL DEFAULT 'PENDING_VERIFICATION',
    join_date           DATE,
    verified_at         DATETIME(6),
    verified_by         BIGINT,
    rejection_reason    VARCHAR(500),
    termination_status  VARCHAR(30),
    termination_reason  VARCHAR(500),
    notice_period_days  INT,
    last_working_date   DATE,
    terminated_at       DATETIME(6),
    terminated_by       BIGINT,
    base_salary         DECIMAL(12,2),
    salary_currency     VARCHAR(10)     DEFAULT 'INR',
    salary_period       VARCHAR(20)     DEFAULT 'MONTHLY',
    verification_id     BIGINT,
    created_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_emp_company_user (company_id, user_id),
    UNIQUE KEY uk_emp_code (employee_code),
    INDEX idx_emp_company_status (company_id, status),
    INDEX idx_emp_user (user_id),
    INDEX idx_emp_hr (hr_profile_id),
    INDEX idx_emp_verification (verification_id),
    CONSTRAINT fk_emp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_emp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_emp_hr FOREIGN KEY (hr_profile_id) REFERENCES hr_profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_emp_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_emp_terminated_by FOREIGN KEY (terminated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_emp_verification FOREIGN KEY (verification_id) REFERENCES company_candidate_verifications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Employee Status History Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS employee_status_history (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    employee_id         BIGINT          NOT NULL,
    from_status         VARCHAR(30),
    to_status           VARCHAR(30)     NOT NULL,
    changed_by          BIGINT,
    notes               TEXT,
    created_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_esh_employee (employee_id),
    INDEX idx_esh_created_at (created_at),
    CONSTRAINT fk_esh_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_esh_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Salary Disbursements Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_disbursements (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    employee_id         BIGINT          NOT NULL,
    company_id          BIGINT          NOT NULL,
    amount              DECIMAL(12,2)   NOT NULL,
    currency            VARCHAR(10)     NOT NULL DEFAULT 'INR',
    period_label        VARCHAR(50)     NOT NULL,
    disbursement_type   VARCHAR(30)     NOT NULL DEFAULT 'MONTHLY_SALARY',
    status              VARCHAR(30)     NOT NULL DEFAULT 'DRAFT',
    submitted_by        BIGINT,
    submitted_at        DATETIME(6),
    approved_by         BIGINT,
    approved_at         DATETIME(6),
    rejection_reason    VARCHAR(500),
    payment_provider    VARCHAR(30),
    transaction_ref     VARCHAR(200),
    payment_status      VARCHAR(30),
    paid_at             DATETIME(6),
    payment_error       TEXT,
    notes               TEXT,
    created_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),

    PRIMARY KEY (id),
    INDEX idx_sd_company_status (company_id, status),
    INDEX idx_sd_employee (employee_id),
    INDEX idx_sd_period (company_id, period_label),
    CONSTRAINT fk_sd_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_sd_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sd_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sd_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
