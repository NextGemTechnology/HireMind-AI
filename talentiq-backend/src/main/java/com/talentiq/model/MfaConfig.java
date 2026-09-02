package com.talentiq.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "mfa_configs",
        indexes = {
                @Index(name = "idx_mfa_user_id", columnList = "user_id", unique = true)
        }
)
@Builder
public class MfaConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "totp_secret", nullable = false, length = 500)
    private String totpSecret;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = false;

    @Column(name = "backup_codes", columnDefinition = "JSON")
    private String backupCodes;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
