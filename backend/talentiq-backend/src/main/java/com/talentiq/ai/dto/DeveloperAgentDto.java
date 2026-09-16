package com.talentiq.ai.dto;
import com.talentiq.ai.model.*;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class DeveloperAgentDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeveloperChatRequest {
        @NotBlank(message = "Prompt cannot be blank")
        private String prompt;

        @Builder.Default
        private String mode = "GENERAL_DEV"; // ARCHITECTURE, SQL_OPTIMIZER, LOG_ANALYZER, SECURITY_AUDIT, CODE_REVIEW, GENERAL_DEV

        private String systemPrompt;

        @Builder.Default
        private Double temperature = 0.7;

        @Builder.Default
        private Boolean includeSystemContext = false;

        private String contextData;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeveloperChatResponse {
        private String reply;
        private String mode;
        private String modelUsed;
        private Integer promptTokens;
        private Integer completionTokens;
        private Integer totalTokens;
        private Long latencyMs;
        private Boolean systemContextIncluded;
        private Instant timestamp;
        private Map<String, Object> diagnosticSnapshot;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeveloperModeInfo {
        private String mode;
        private String title;
        private String icon;
        private String description;
        private String defaultSystemPrompt;
        private List<String> suggestedPrompts;
    }
}
