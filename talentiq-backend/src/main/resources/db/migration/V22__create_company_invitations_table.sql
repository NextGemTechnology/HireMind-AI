-- ============================================================
-- V22: Company Direct HR & Candidate Invitations Table
-- ============================================================

CREATE TABLE IF NOT EXISTS company_invitations (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    company_id          BIGINT          NOT NULL,
    inviter_user_id     BIGINT          NOT NULL,
    email               VARCHAR(255)    NOT NULL,
    recipient_name      VARCHAR(150),
    role                VARCHAR(30)     NOT NULL DEFAULT 'ROLE_HR',
    designation         VARCHAR(150),
    invite_token        VARCHAR(64)     NOT NULL,
    status              VARCHAR(30)     NOT NULL DEFAULT 'PENDING',
    auto_verify_badge   BOOLEAN         NOT NULL DEFAULT TRUE,
    expires_at          DATETIME(6)     NOT NULL,
    accepted_at         DATETIME(6)     NULL,
    created_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_comp_inv_token (invite_token),
    INDEX idx_comp_inv_company (company_id),
    INDEX idx_comp_inv_email (email),
    INDEX idx_comp_inv_status (status),
    INDEX idx_comp_inv_expires (expires_at),
    CONSTRAINT fk_comp_inv_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
