package com.talentiq.model.auth;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
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
        name = "hr_credentials",
        indexes = {
                @Index(name = "idx_hr_cred_email", columnList = "email", unique = true),
                @Index(name = "idx_hr_cred_user_id", columnList = "user_id"),
                @Index(name = "idx_hr_cred_status", columnList = "status"),
                @Index(name = "idx_hr_cred_locked_until", columnList = "locked_until")
        }
)
public class HrCredential extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_profile_id")
    private HrProfile hrProfile;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Role role = Role.ROLE_HR;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = true;

    @Column(name = "password_reset_otp", length = 10)
    private String passwordResetOtp;

    @Column(name = "password_reset_otp_expires_at")
    private Instant passwordResetOtpExpiresAt;

    @Column(name = "login_attempts")
    @Builder.Default
    private int loginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    public boolean isLocked() {
        return lockedUntil != null && Instant.now().isBefore(lockedUntil);
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE && emailVerified;
    }

    public void incrementLoginAttempts() {
        this.loginAttempts++;
    }

    public void resetLoginAttempts() {
        this.loginAttempts = 0;
        this.lockedUntil = null;
    }
}
