-- ============================================================
-- V25: Subscription Plans, Subscriptions, Payment Transactions,
--      and Webhook Events for Payment Gateway Integration
-- ============================================================

-- 1. Subscription Plan Catalog
-- Stores plan definitions for CANDIDATE, HR, and COMPANY roles
CREATE TABLE IF NOT EXISTS subscription_plans (
    id             BIGINT NOT NULL AUTO_INCREMENT,
    plan_code      VARCHAR(50)     NOT NULL,
    name           VARCHAR(100)    NOT NULL,
    description    TEXT,
    target_role    VARCHAR(30)     NOT NULL COMMENT 'CANDIDATE | HR | COMPANY',
    price_amount   DECIMAL(12, 2)  NOT NULL,
    currency       VARCHAR(10)     NOT NULL DEFAULT 'INR',
    billing_cycle  VARCHAR(20)     NOT NULL DEFAULT 'MONTHLY' COMMENT 'MONTHLY | YEARLY',
    features_json  TEXT            COMMENT 'JSON array of feature strings',
    max_jobs       INT             NULL     COMMENT 'NULL = unlimited',
    max_ai_matches INT             NULL     COMMENT 'NULL = unlimited',
    is_active      BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order  INT             NOT NULL DEFAULT 0,
    created_at     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_plan_code (plan_code),
    INDEX idx_sp_target_role (target_role),
    INDEX idx_sp_is_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Active Subscriptions
-- Links a user (and optionally a company) to a plan
CREATE TABLE IF NOT EXISTS subscriptions (
    id                      BIGINT      NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT      NOT NULL,
    company_id              BIGINT      NULL,
    plan_id                 BIGINT      NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                                        COMMENT 'ACTIVE | EXPIRED | CANCELLED | PAST_DUE | TRIALING',
    current_period_start    DATETIME(6) NOT NULL,
    current_period_end      DATETIME(6) NOT NULL,
    auto_renew              BOOLEAN     NOT NULL DEFAULT TRUE,
    gateway_subscription_id VARCHAR(255) NULL,
    cancelled_at            DATETIME(6) NULL,
    cancel_reason           TEXT        NULL,
    created_at              DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255),

    PRIMARY KEY (id),
    INDEX idx_sub_user_id (user_id),
    INDEX idx_sub_company_id (company_id),
    INDEX idx_sub_status (status),
    INDEX idx_sub_period_end (current_period_end),
    INDEX idx_sub_user_status (user_id, status),
    CONSTRAINT fk_sub_user    FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
    CONSTRAINT fk_sub_plan    FOREIGN KEY (plan_id)    REFERENCES subscription_plans (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Payment Transactions
-- Full audit trail of every payment attempt
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    order_id           VARCHAR(100) NOT NULL COMMENT 'Internal order ID',
    gateway_order_id   VARCHAR(255) NULL     COMMENT 'Razorpay order_id',
    gateway_payment_id VARCHAR(255) NULL     COMMENT 'Razorpay payment_id after capture',
    user_id            BIGINT       NOT NULL,
    subscription_id    BIGINT       NULL,
    plan_id            BIGINT       NOT NULL,
    amount             DECIMAL(12, 2) NOT NULL,
    currency           VARCHAR(10)  NOT NULL DEFAULT 'INR',
    status             VARCHAR(30)  NOT NULL DEFAULT 'CREATED'
                                    COMMENT 'CREATED | AUTHORIZED | CAPTURED | FAILED | REFUNDED',
    gateway_provider   VARCHAR(30)  NOT NULL DEFAULT 'MOCK' COMMENT 'RAZORPAY | MOCK',
    gateway_signature  VARCHAR(500) NULL,
    idempotency_key    VARCHAR(255) NOT NULL,
    error_message      TEXT         NULL,
    metadata_json      TEXT         NULL,
    created_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by         VARCHAR(255),
    updated_by         VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_pt_order_id (order_id),
    UNIQUE KEY uk_pt_idempotency_key (idempotency_key),
    INDEX idx_pt_user_id (user_id),
    INDEX idx_pt_subscription_id (subscription_id),
    INDEX idx_pt_status (status),
    INDEX idx_pt_gateway_order_id (gateway_order_id),
    CONSTRAINT fk_pt_user         FOREIGN KEY (user_id)         REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE SET NULL,
    CONSTRAINT fk_pt_plan         FOREIGN KEY (plan_id)         REFERENCES subscription_plans (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4. Webhook Events
-- Idempotent audit log to prevent duplicate webhook processing
CREATE TABLE IF NOT EXISTS webhook_events (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    event_id         VARCHAR(255) NOT NULL COMMENT 'Gateway-provided unique event ID',
    gateway_provider VARCHAR(30)  NOT NULL,
    event_type       VARCHAR(100) NOT NULL,
    payload_json     TEXT         NOT NULL,
    processed        BOOLEAN      NOT NULL DEFAULT FALSE,
    processed_at     DATETIME(6)  NULL,
    error_message    TEXT         NULL,
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_we_event_id (event_id),
    INDEX idx_we_processed (processed),
    INDEX idx_we_gateway_provider (gateway_provider),
    INDEX idx_we_event_type (event_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 5. Seed: Initial Subscription Plans
INSERT INTO subscription_plans (plan_code, name, description, target_role, price_amount, currency, billing_cycle, features_json, max_jobs, max_ai_matches, is_active, display_order)
VALUES
    ('CANDIDATE_PRO',
     'Candidate Pro',
     'Unlock premium features to accelerate your job search and stand out to recruiters.',
     'CANDIDATE', 99.00, 'INR', 'MONTHLY',
     '["Priority job applications","AI-powered resume optimization","Direct recruiter messaging","Featured profile badge","Unlimited AI job matches","Application analytics dashboard"]',
     NULL, NULL, TRUE, 1),

    ('HR_PRO',
     'HR Pro',
     'Streamline your hiring pipeline with smart shortlisting and candidate management tools.',
     'HR', 499.00, 'INR', 'MONTHLY',
     '["One-click resume shortlisting","Bulk candidate filtering","Advanced search filters","Candidate ranking score","Export candidate lists","Priority support"]',
     50, NULL, TRUE, 2),

    ('HR_ENTERPRISE',
     'HR Enterprise',
     'Full-featured interview management with pipeline analytics — everything in HR Pro, plus more.',
     'HR', 1999.00, 'INR', 'MONTHLY',
     '["Everything in HR Pro","Interview scheduling & tracking","Candidate interview notes & ratings","Multi-stage pipeline management","Hiring analytics & reports","Team collaboration tools","Dedicated account manager"]',
     NULL, NULL, TRUE, 3),

    ('COMPANY_GROWTH',
     'Company Growth',
     'For growing companies managing an active recruitment team.',
     'COMPANY', 4999.00, 'INR', 'MONTHLY',
     '["Up to 5 HR recruiter seats","50 active job postings","Candidate pipeline management","Basic hiring analytics","Company verification badge","Email & chat support"]',
     50, NULL, TRUE, 4),

    ('COMPANY_ENTERPRISE',
     'Company Enterprise',
     'Unlimited scale for enterprise hiring teams with full platform access.',
     'COMPANY', 14999.00, 'INR', 'MONTHLY',
     '["Unlimited HR recruiter seats","Unlimited job postings","Advanced AI candidate matching","Full hiring analytics & reports","Custom company branding","API access","Dedicated account manager","24/7 priority support"]',
     NULL, NULL, TRUE, 5);
