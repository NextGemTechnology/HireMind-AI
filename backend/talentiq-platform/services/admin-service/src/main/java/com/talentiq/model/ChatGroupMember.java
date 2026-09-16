package com.talentiq.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "chat_group_members",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_group_member", columnNames = {"group_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_group_members_user", columnList = "user_id"),
                @Index(name = "idx_group_members_group", columnList = "group_id")
        }
)
@Builder
public class ChatGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private ChatGroup group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "role", nullable = false, length = 30)
    @Builder.Default
    private String role = "MEMBER"; // ADMIN, MEMBER

    @Column(name = "joined_at", nullable = false)
    @Builder.Default
    private Instant joinedAt = Instant.now();
}
