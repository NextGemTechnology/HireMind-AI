package com.talentiq.ai.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "ai_user_preferences",
        indexes = {
                @Index(name = "idx_ai_user_preferences_user", columnList = "user_id")
        }
)
@Builder
public class AiUserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "chat_storage_enabled", nullable = false)
    @Builder.Default
    private boolean chatStorageEnabled = true;

    @Column(name = "retention_days", nullable = false)
    @Builder.Default
    private int retentionDays = 90;

    @Column(name = "data_sharing_consent", nullable = false)
    @Builder.Default
    private boolean dataSharingConsent = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
