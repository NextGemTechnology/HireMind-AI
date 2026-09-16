-- ============================================================
-- V15: Collaboration Chat Groups, Members, Messages, Verifications & Invitations
-- ============================================================

-- ── 1. Collaboration Chat Groups ──────────────────────────────
CREATE TABLE IF NOT EXISTS chat_groups (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    name                VARCHAR(150)    NOT NULL,
    description         VARCHAR(500),
    company_id          BIGINT,
    creator_user_id     BIGINT          NOT NULL,
    avatar_url          VARCHAR(500),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),

    PRIMARY KEY (id),
    INDEX idx_chat_groups_company_id (company_id),
    INDEX idx_chat_groups_creator_user (creator_user_id),
    INDEX idx_chat_groups_created_at (created_at),
    CONSTRAINT fk_chat_group_creator FOREIGN KEY (creator_user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Chat Group Members ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_group_members (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    group_id            BIGINT          NOT NULL,
    user_id             BIGINT          NOT NULL,
    role                VARCHAR(30)     NOT NULL DEFAULT 'MEMBER',
    joined_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_group_member (group_id, user_id),
    INDEX idx_group_members_user (user_id),
    INDEX idx_group_members_group (group_id),
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id)
        REFERENCES chat_groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_member_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Group Chat Messages ────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_chat_messages (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    group_id            BIGINT          NOT NULL,
    sender_id           BIGINT          NOT NULL,
    sender_name         VARCHAR(200)    NOT NULL,
    content             TEXT            NOT NULL,
    type                VARCHAR(30)     NOT NULL DEFAULT 'TEXT',
    file_url            VARCHAR(500),
    file_name           VARCHAR(255),
    sent_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_group_msg_group_sent (group_id, sent_at),
    INDEX idx_group_msg_sender (sender_id),
    CONSTRAINT fk_group_msg_group FOREIGN KEY (group_id)
        REFERENCES chat_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Company Candidate Verifications ────────────────────────
CREATE TABLE IF NOT EXISTS company_candidate_verifications (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    company_id              BIGINT          NOT NULL,
    hr_user_id              BIGINT          NOT NULL,
    candidate_user_id       BIGINT          NOT NULL,
    job_title               VARCHAR(150)    NOT NULL,
    department              VARCHAR(100),
    status                  VARCHAR(30)     NOT NULL DEFAULT 'PENDING',
    requested_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at             TIMESTAMP       NULL,
    approved_by_user_id     BIGINT          NULL,
    rejection_reason        VARCHAR(500),
    badge_certificate_id    VARCHAR(64),
    skills_tagged           VARCHAR(500),
    notes                   TEXT,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255),

    PRIMARY KEY (id),
    UNIQUE KEY uk_comp_verif_badge_cert (badge_certificate_id),
    INDEX idx_comp_verif_company_status (company_id, status),
    INDEX idx_comp_verif_candidate (candidate_user_id, status),
    INDEX idx_comp_verif_hr (hr_user_id),
    INDEX idx_comp_verif_lookup (company_id, candidate_user_id, status),
    CONSTRAINT fk_comp_verif_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_comp_verif_hr FOREIGN KEY (hr_user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_comp_verif_candidate FOREIGN KEY (candidate_user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_comp_verif_approver FOREIGN KEY (approved_by_user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Group Chat Invitations Table ───────────────────────────
CREATE TABLE IF NOT EXISTS group_chat_invitations (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    group_id            BIGINT          NOT NULL,
    invite_token        VARCHAR(64)     NOT NULL,
    created_by_user_id  BIGINT          NOT NULL,
    target_user_id      BIGINT          NULL,
    max_uses            INT             NOT NULL DEFAULT 10,
    current_uses        INT             NOT NULL DEFAULT 0,
    expires_at          TIMESTAMP       NOT NULL,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_group_invite_token (invite_token),
    INDEX idx_invite_group (group_id),
    INDEX idx_invite_creator (created_by_user_id),
    INDEX idx_invite_target (target_user_id),
    INDEX idx_invite_expires (expires_at),
    INDEX idx_invite_active_expires (is_active, expires_at),
    CONSTRAINT fk_group_invite_group FOREIGN KEY (group_id)
        REFERENCES chat_groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_invite_creator FOREIGN KEY (created_by_user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Messaging Performance Indexes ──────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    sender_id           BIGINT          NOT NULL,
    receiver_id         BIGINT          NOT NULL,
    content             TEXT            NOT NULL,
    type                VARCHAR(30)     NOT NULL DEFAULT 'TEXT',
    file_url            VARCHAR(500),
    file_name           VARCHAR(255),
    is_read             BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMP       NULL,
    sent_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_chat_msg_sender_receiver (sender_id, receiver_id, sent_at),
    INDEX idx_chat_msg_unread (receiver_id, is_read, sender_id),
    CONSTRAINT fk_chat_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
