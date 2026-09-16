-- ============================================================
-- V3: Companies and HR Profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(200)    NOT NULL,
    slug            VARCHAR(200)    NOT NULL,
    website         VARCHAR(500),
    industry        VARCHAR(100),
    company_size    VARCHAR(30),     -- STARTUP, SMALL, MEDIUM, LARGE, ENTERPRISE
    description     TEXT,
    logo_url        VARCHAR(500),
    banner_url      VARCHAR(500),
    location        VARCHAR(200),
    founded_year    INT,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    linkedin_url    VARCHAR(500),
    twitter_url     VARCHAR(500),
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_companies_slug (slug),
    INDEX idx_companies_industry (industry),
    INDEX idx_companies_is_verified (is_verified),
    INDEX idx_companies_is_active (is_active),
    INDEX idx_companies_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── HR Profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hr_profiles (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL,
    company_id          BIGINT          NOT NULL,
    designation         VARCHAR(150),
    department          VARCHAR(100),
    is_company_admin    BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_hr_profiles_user_id (user_id),
    INDEX idx_hr_profiles_company_id (company_id),
    INDEX idx_hr_profiles_is_company_admin (is_company_admin),
    CONSTRAINT fk_hr_profiles_user_id FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_hr_profiles_company_id FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Company Embeddings (for semantic search of companies) ─────
CREATE TABLE IF NOT EXISTS company_embeddings (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    company_id      BIGINT          NOT NULL,
    embedding_json  LONGTEXT        NOT NULL,
    model           VARCHAR(100)    NOT NULL DEFAULT 'text-embedding-3-small',
    content_hash    VARCHAR(64)     NOT NULL,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_company_embeddings_company_id (company_id),
    CONSTRAINT fk_company_embeddings_company_id FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
