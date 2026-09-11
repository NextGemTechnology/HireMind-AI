-- ============================================================
-- V26: Subscription Hardening, Payment Methods & Masked Details
-- ============================================================

ALTER TABLE payment_transactions
    ADD COLUMN payment_method VARCHAR(50) NULL AFTER status,
    ADD COLUMN masked_details VARCHAR(255) NULL AFTER payment_method,
    MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'CREATED'
        COMMENT 'CREATED | PENDING | AUTHORIZED | PAID | CAPTURED | FAILED | CANCELLED | REFUNDED';

CREATE INDEX idx_pt_user_status ON payment_transactions (user_id, status);
