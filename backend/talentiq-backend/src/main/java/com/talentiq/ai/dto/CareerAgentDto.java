package com.talentiq.ai.dto;
import com.talentiq.ai.model.*;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.talentiq.dto.job.JobDto;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

public class CareerAgentDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatRequest {
        @NotBlank(message = "Message content is required")
        private String message;
        private Long conversationId;
        private List<ChatMessageItem> history;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessageItem {
        private String role; // "user" or "assistant"
        private String content;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ChatResponse {
        private Long conversationId;
        private String reply;
        private List<JobDto.Response> suggestedJobs;
        private String intent; // "SKILL_SEARCH", "RESUME_MATCH", "REFUSAL_NON_CAREER", "SECURITY_WARNING", "SECURITY_BLOCKED", "GENERAL_CAREER"
        private int warningCount;
        private boolean isBlocked;
        private Instant blockedUntil;
        private boolean requiresResume;
        private String extractedRole;
        private Integer matchScore;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConversationResponse {
        private Long id;
        private String title;
        private int messageCount;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationRequest {
        private String title;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PreferencesDto {
        private boolean chatStorageEnabled;
        private int retentionDays;
        private boolean dataSharingConsent;
    }
}
