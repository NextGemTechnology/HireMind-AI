package com.talentiq.model;

import lombok.*;
import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.util.HashSet;
import java.util.Set;

/**
 * Master User Profile Entity.
 * Contains purely business and profile attributes.
 * All authentication secrets, passwords, OTPs, and lockout metadata
 * are stored exclusively in the dedicated UserCredential entity/table.
 */
@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email", unique = true),
                @Index(name = "idx_users_status", columnList = "status"),
                @Index(name = "idx_users_created_at", columnList = "created_at")
        }
)
@Builder
public class User extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = true;

    @Column(name = "last_seen_at")
    private java.time.Instant lastSeenAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            indexes = @Index(name = "idx_user_roles_user_id", columnList = "user_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    @BatchSize(size = 50)
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    // ── Business Profile Methods ──────────────────────────────────────────────

    public String getFullName() {
        return firstName + " " + lastName;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE && emailVerified;
    }

    public void addRole(Role role) {
        this.roles.add(role);
    }

    public void removeRole(Role role) {
        this.roles.remove(role);
    }

    public boolean hasRole(Role role) {
        return this.roles.contains(role);
    }
}
