package com.talentiq.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "ai_security_events",
        indexes = {
                @Index(name = "idx_ai_sec_user", columnList = "user_id"),
                @Index(name = "idx_ai_sec_type", columnList = "event_type"),
                @Index(name = "idx_ai_sec_created", columnList = "created_at")
        }
)
@Builder
public class AiSecurityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType; // PROMPT_INJECTION, MIME_MISMATCH, HIDDEN_TEXT_ALERT, RATE_LIMITED, QUOTA_EXCEEDED, USER_BLOCKED, PII_DETECTED

    @Column(name = "input_sample", length = 500)
    private String inputSample;

    @Column(name = "detection_pattern", length = 200)
    private String detectionPattern;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM"; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(columnDefinition = "JSON")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
