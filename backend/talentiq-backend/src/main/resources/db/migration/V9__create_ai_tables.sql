-- ============================================================
-- V9: AI Conversations, Messages, and Copilot Config
-- ============================================================

-- ── HR AI Copilot Conversations ───────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    hr_id           BIGINT          NOT NULL,   -- HR user_id (conversation owner)
    company_id      BIGINT          NOT NULL,   -- Scoped to this company
    title           VARCHAR(300),
    context_type    VARCHAR(30)     NOT NULL DEFAULT 'GENERAL',  -- GENERAL, CANDIDATE, JOB, ANALYSIS
    context_id      BIGINT,                     -- Optional: related entity ID
    is_pinned       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN         NOT NULL DEFAULT FALSE,
    message_count   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_ai_conversations_hr_id (hr_id),
    INDEX idx_ai_conversations_company_id (company_id),
    INDEX idx_ai_conversations_is_archived (is_archived),
    INDEX idx_ai_conversations_updated_at (updated_at),
    CONSTRAINT fk_ai_conversations_hr_id FOREIGN KEY (hr_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_conversations_company_id FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── AI Messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    conversation_id     BIGINT          NOT NULL,
    role                VARCHAR(20)     NOT NULL,   -- USER, ASSISTANT, SYSTEM, TOOL
    content             LONGTEXT        NOT NULL,
    tool_calls          JSON,                       -- Function calls made by AI
    tool_results        JSON,                       -- Results returned by tools
    tokens_used         INT,
    model               VARCHAR(100),
    latency_ms          INT,
    metadata            JSON,                       -- Additional context
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_ai_messages_conversation_id (conversation_id),
    INDEX idx_ai_messages_created_at (created_at),
    CONSTRAINT fk_ai_messages_conversation_id FOREIGN KEY (conversation_id)
        REFERENCES ai_conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── AI Copilot Configuration (per HR) ────────────────────────
CREATE TABLE IF NOT EXISTS ai_copilot_config (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    hr_id               BIGINT          NOT NULL,
    preferred_model     VARCHAR(100)    NOT NULL DEFAULT 'gpt-4o',
    system_prompt       TEXT,
    temperature         DECIMAL(3, 2)   NOT NULL DEFAULT 0.70,
    enable_memory       BOOLEAN         NOT NULL DEFAULT TRUE,
    memory_window       INT             NOT NULL DEFAULT 20,   -- Last N messages
    enable_rag          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_ai_copilot_config_hr_id (hr_id),
    CONSTRAINT fk_ai_copilot_config_hr_id FOREIGN KEY (hr_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── AI Usage Tracking ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL,
    company_id      BIGINT,
    feature         VARCHAR(50)     NOT NULL,   -- COPILOT, PARSER, RECOMMENDER, SEARCH
    model           VARCHAR(100),
    prompt_tokens   INT             NOT NULL DEFAULT 0,
    completion_tokens INT           NOT NULL DEFAULT 0,
    total_tokens    INT             NOT NULL DEFAULT 0,
    latency_ms      INT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'SUCCESS',
    error_message   TEXT,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_ai_usage_logs_user_id (user_id),
    INDEX idx_ai_usage_logs_company_id (company_id),
    INDEX idx_ai_usage_logs_feature (feature),
    INDEX idx_ai_usage_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
