package com.talentiq.dto.notification;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

public class NotificationDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank(message = "Message content is required")
        private String message;

        private String type; // APPLICATION_STATUS, RECOMMENDATION, SYSTEM_ALERT, SECURITY
        private String linkUrl;
    }

    @Data
    @Builder
    public static class Response {
        private Long id;
        private Long userId;
        private String title;
        private String message;
        private String type;
        private boolean read;
        private Instant readAt;
        private String linkUrl;
        private Instant createdAt;
    }

    @Data
    public static class PreferencesUpdateRequest {
        private Boolean emailNotificationsEnabled;
        private Boolean inAppEnabled;
        private Boolean marketingEnabled;
        private Boolean jobAlertsEnabled;
    }

    @Data
    @Builder
    public static class PreferencesResponse {
        private Long id;
        private Long userId;
        private boolean emailNotificationsEnabled;
        private boolean inAppEnabled;
        private boolean marketingEnabled;
        private boolean jobAlertsEnabled;
    }
}
