-- ============================================================
-- V7: Portfolios, Themes, and Sections
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolios (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT          NOT NULL,
    slug            VARCHAR(200)    NOT NULL,
    title           VARCHAR(200),
    tagline         VARCHAR(300),
    is_public       BOOLEAN         NOT NULL DEFAULT FALSE,
    custom_domain   VARCHAR(255),
    template        VARCHAR(50)     NOT NULL DEFAULT 'DEFAULT',    -- DEFAULT, MINIMAL, CREATIVE, etc.
    views_count     INT             NOT NULL DEFAULT 0,
    -- SEO
    seo_title       VARCHAR(200),
    seo_description VARCHAR(500),
    seo_keywords    JSON,
    og_image_url    VARCHAR(500),
    -- Settings
    show_email      BOOLEAN         NOT NULL DEFAULT FALSE,
    show_phone      BOOLEAN         NOT NULL DEFAULT FALSE,
    show_location   BOOLEAN         NOT NULL DEFAULT TRUE,
    resume_download_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_portfolios_candidate_id (candidate_id),
    UNIQUE KEY uk_portfolios_slug (slug),
    INDEX idx_portfolios_is_public (is_public),
    INDEX idx_portfolios_custom_domain (custom_domain),
    CONSTRAINT fk_portfolios_candidate_id FOREIGN KEY (candidate_id)
        REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Portfolio Themes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_themes (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    portfolio_id        BIGINT          NOT NULL,
    -- Colors
    primary_color       VARCHAR(20)     NOT NULL DEFAULT '#6366f1',
    secondary_color     VARCHAR(20)     NOT NULL DEFAULT '#8b5cf6',
    accent_color        VARCHAR(20)     NOT NULL DEFAULT '#06b6d4',
    background_color    VARCHAR(20)     NOT NULL DEFAULT '#0f172a',
    text_color          VARCHAR(20)     NOT NULL DEFAULT '#f8fafc',
    card_color          VARCHAR(20)     NOT NULL DEFAULT '#1e293b',
    -- Typography
    heading_font        VARCHAR(100)    NOT NULL DEFAULT 'Inter',
    body_font           VARCHAR(100)    NOT NULL DEFAULT 'Inter',
    -- Dark/Light Mode
    default_mode        VARCHAR(10)     NOT NULL DEFAULT 'dark',
    -- Hero
    hero_type           VARCHAR(30)     NOT NULL DEFAULT '3D',     -- 3D, PARTICLES, VIDEO, IMAGE
    hero_config         JSON,                                       -- 3D scene or particle config
    -- Animation
    animation_enabled   BOOLEAN         NOT NULL DEFAULT TRUE,
    animation_speed     VARCHAR(10)     NOT NULL DEFAULT 'normal',  -- slow, normal, fast
    -- Background
    background_type     VARCHAR(20)     NOT NULL DEFAULT 'gradient', -- gradient, mesh, pattern, image
    background_config   JSON,
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_portfolio_themes_portfolio_id (portfolio_id),
    CONSTRAINT fk_portfolio_themes_portfolio_id FOREIGN KEY (portfolio_id)
        REFERENCES portfolios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Portfolio Sections ────────────────────────────────────────
-- Dynamic, orderable sections that make up the portfolio page.
CREATE TABLE IF NOT EXISTS portfolio_sections (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    portfolio_id    BIGINT          NOT NULL,
    section_type    VARCHAR(50)     NOT NULL,    -- HERO, ABOUT, SKILLS, EXPERIENCE, EDUCATION, PROJECTS, BLOG, CONTACT
    title           VARCHAR(200),
    is_visible      BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   INT             NOT NULL DEFAULT 0,
    config          JSON,                       -- Section-specific configuration

    PRIMARY KEY (id),
    INDEX idx_portfolio_sections_portfolio_id (portfolio_id),
    INDEX idx_portfolio_sections_section_type (section_type),
    UNIQUE KEY uk_portfolio_sections_portfolio_type (portfolio_id, section_type),
    CONSTRAINT fk_portfolio_sections_portfolio_id FOREIGN KEY (portfolio_id)
        REFERENCES portfolios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Portfolio Blog Posts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_blogs (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    portfolio_id    BIGINT          NOT NULL,
    title           VARCHAR(300)    NOT NULL,
    slug            VARCHAR(300)    NOT NULL,
    content         LONGTEXT,
    excerpt         TEXT,
    cover_image_url VARCHAR(500),
    tags            JSON,
    is_published    BOOLEAN         NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMP,
    views_count     INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    UNIQUE KEY uk_portfolio_blogs_portfolio_slug (portfolio_id, slug),
    INDEX idx_portfolio_blogs_portfolio_id (portfolio_id),
    INDEX idx_portfolio_blogs_is_published (is_published),
    CONSTRAINT fk_portfolio_blogs_portfolio_id FOREIGN KEY (portfolio_id)
        REFERENCES portfolios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
