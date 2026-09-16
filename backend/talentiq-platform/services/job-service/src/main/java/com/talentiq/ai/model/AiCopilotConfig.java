package com.talentiq.ai.model;
import lombok.*;

import com.talentiq.model.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "ai_copilot_config",
        uniqueConstraints = @UniqueConstraint(name = "uk_ai_copilot_config_hr_id", columnNames = {"hr_id"})
)
@Builder
public class AiCopilotConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hr_id", nullable = false, unique = true)
    private User hr;

    @Column(name = "preferred_model", nullable = false, length = 100)
    @Builder.Default
    private String preferredModel = "gpt-4o";

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal temperature = BigDecimal.valueOf(0.70);

    @Column(name = "enable_memory", nullable = false)
    @Builder.Default
    private boolean enableMemory = true;

    @Column(name = "memory_window", nullable = false)
    @Builder.Default
    private Integer memoryWindow = 20;

    @Column(name = "enable_rag", nullable = false)
    @Builder.Default
    private boolean enableRag = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
