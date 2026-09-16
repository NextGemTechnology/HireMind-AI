package com.talentiq.ai.dto;
import com.talentiq.ai.model.*;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class AiCopilotDto {

    @Data
    public static class ConversationRequest {
        private String title;
        private String contextType; // GENERAL, CANDIDATE, JOB, ANALYSIS
        private Long contextId;
    }

    @Data
    @Builder
    public static class ConversationResponse {
        private Long id;
        private String title;
        private String contextType;
        private Long contextId;
        private boolean pinned;
        private boolean archived;
        private Integer messageCount;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    public static class MessageRequest {
        @NotBlank(message = "Message prompt content is required")
        private String content;
    }

    @Data
    @Builder
    public static class MessageResponse {
        private Long id;
        private String role; // USER, ASSISTANT
        private String content;
        private Instant createdAt;
        private Integer tokensUsed;
    }

    @Data
    public static class ConfigUpdateRequest {
        private String preferredModel;
        private String systemPrompt;
        private BigDecimal temperature;
        private Boolean enableMemory;
        private Integer memoryWindow;
        private Boolean enableRag;
    }

    @Data
    @Builder
    public static class ConfigResponse {
        private Long id;
        private String preferredModel;
        private String systemPrompt;
        private BigDecimal temperature;
        private boolean enableMemory;
        private Integer memoryWindow;
        private boolean enableRag;
    }
}
