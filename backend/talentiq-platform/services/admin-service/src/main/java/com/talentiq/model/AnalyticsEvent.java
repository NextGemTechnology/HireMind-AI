package com.talentiq.model;
import lombok.*;

import com.talentiq.model.User;
import jakarta.persistence.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "analytics_events",
        indexes = {
                @Index(name = "idx_analytics_events_user_id", columnList = "user_id"),
                @Index(name = "idx_analytics_events_event_type", columnList = "event_type"),
                @Index(name = "idx_analytics_events_entity", columnList = "entity_type, entity_id"),
                @Index(name = "idx_analytics_events_created_at", columnList = "created_at")
        }
)
@Builder
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType; // JOB_VIEW, SEARCH, APPLICATION_SUBMIT, RESUME_UPLOAD

    @Column(name = "entity_type", length = 50)
    private String entityType; // JOB, CANDIDATE, COMPANY

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "properties_json", columnDefinition = "JSON")
    private String propertiesJson;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
