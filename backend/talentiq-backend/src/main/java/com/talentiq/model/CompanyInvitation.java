package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "company_invitations",
        indexes = {
                @Index(name = "idx_comp_inv_company", columnList = "company_id"),
                @Index(name = "idx_comp_inv_email", columnList = "email"),
                @Index(name = "idx_comp_inv_status", columnList = "status"),
                @Index(name = "idx_comp_inv_expires", columnList = "expires_at")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_comp_inv_token", columnNames = "invite_token")
        }
)
public class CompanyInvitation extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "inviter_user_id", nullable = false)
    private Long inviterUserId;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "recipient_name", length = 150)
    private String recipientName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Role role = Role.ROLE_HR;

    @Column(length = 150)
    private String designation;

    @Column(name = "invite_token", nullable = false, unique = true, length = 64)
    private String inviteToken;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, ACCEPTED, REVOKED, EXPIRED

    @Column(name = "auto_verify_badge", nullable = false)
    @Builder.Default
    private boolean autoVerifyBadge = true;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isPending() {
        return "PENDING".equalsIgnoreCase(status) && !isExpired();
    }
}
