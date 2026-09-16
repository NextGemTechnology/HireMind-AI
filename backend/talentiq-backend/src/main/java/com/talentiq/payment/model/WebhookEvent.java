package com.talentiq.payment.model;

import com.talentiq.payment.enums.GatewayProvider;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Idempotent audit log of received webhooks.
 * Prevents processing the same webhook event multiple times.
 */
@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "webhook_events",
        indexes = {
                @Index(name = "idx_we_processed", columnList = "processed"),
                @Index(name = "idx_we_gateway_provider", columnList = "gateway_provider"),
                @Index(name = "idx_we_event_type", columnList = "event_type")
        }
)
public class WebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique event ID provided by the payment gateway. */
    @Column(name = "event_id", nullable = false, unique = true, length = 255)
    private String eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "gateway_provider", nullable = false, length = 30)
    private GatewayProvider gatewayProvider;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    @Column(nullable = false)
    @Builder.Default
    private boolean processed = false;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
