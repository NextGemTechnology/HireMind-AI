package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * Collaboration chat group for team communication (HRs, Company Directors, Candidates).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "chat_groups",
        indexes = {
                @Index(name = "idx_chat_groups_company_id", columnList = "company_id"),
                @Index(name = "idx_chat_groups_creator_user", columnList = "creator_user_id"),
                @Index(name = "idx_chat_groups_created_at", columnList = "created_at")
        }
)
@Builder
public class ChatGroup extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "company_id")
    private Long companyId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_user_id", nullable = false)
    private User creatorUser;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
