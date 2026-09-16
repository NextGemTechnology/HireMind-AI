package com.talentiq.ai.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "ai_usage_logs",
        indexes = {
                @Index(name = "idx_ai_usage_logs_user_id", columnList = "user_id"),
                @Index(name = "idx_ai_usage_logs_company_id", columnList = "company_id"),
                @Index(name = "idx_ai_usage_logs_feature", columnList = "feature"),
                @Index(name = "idx_ai_usage_logs_created_at", columnList = "created_at")
        }
)
@Builder
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "company_id")
    private Long companyId;

    @Column(nullable = false, length = 50)
    private String feature; // COPILOT, PARSER, RECOMMENDER, SEARCH, CAREER_AGENT

    @Column(length = 100)
    private String model;

    @Column(name = "prompt_tokens", nullable = false)
    @Builder.Default
    private Integer promptTokens = 0;

    @Column(name = "completion_tokens", nullable = false)
    @Builder.Default
    private Integer completionTokens = 0;

    @Column(name = "total_tokens", nullable = false)
    @Builder.Default
    private Integer totalTokens = 0;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SUCCESS";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (totalTokens == null || totalTokens == 0) {
            int prompt = promptTokens != null ? promptTokens : 0;
            int comp = completionTokens != null ? completionTokens : 0;
            totalTokens = prompt + comp;
        }
    }
}
