package com.talentiq.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Secure invitation token for joining company collaboration chat groups.
 * Enforces company verification gates for candidates.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "group_chat_invitations",
        indexes = {
                @Index(name = "idx_invite_token", columnList = "invite_token", unique = true),
                @Index(name = "idx_invite_group", columnList = "group_id"),
                @Index(name = "idx_invite_creator", columnList = "created_by_user_id"),
                @Index(name = "idx_invite_expires", columnList = "expires_at")
        }
)
@Builder
public class GroupChatInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private ChatGroup group;

    @Column(name = "invite_token", nullable = false, unique = true, length = 64)
    private String inviteToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @Column(name = "max_uses", nullable = false)
    @Builder.Default
    private int maxUses = 10;

    @Column(name = "current_uses", nullable = false)
    @Builder.Default
    private int currentUses = 0;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
