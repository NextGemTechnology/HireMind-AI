package com.talentiq.ai.model;
import lombok.*;

import jakarta.persistence.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "ai_messages",
        indexes = {
                @Index(name = "idx_ai_messages_conversation_id", columnList = "conversation_id"),
                @Index(name = "idx_ai_messages_created_at", columnList = "created_at")
        }
)
@Builder
public class AiMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private AiConversation conversation;

    @Column(nullable = false, length = 20)
    private String role; // USER, ASSISTANT, SYSTEM, TOOL

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String content;

    @Column(name = "tool_calls", columnDefinition = "JSON")
    private String toolCalls;

    @Column(name = "tool_results", columnDefinition = "JSON")
    private String toolResults;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(length = 100)
    private String model;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(columnDefinition = "JSON")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
