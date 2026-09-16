package com.talentiq.dto.company;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

public class CompanyTaskDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateTaskRequest {
        @NotBlank(message = "Task title is required")
        @jakarta.validation.constraints.Size(max = 255)
        private String title;

        private String description;
        private Long assignedToUserId;
        private String priority;   // HIGH, MEDIUM, LOW
        private String category;   // HIRING, INTERVIEW, COMPLIANCE, GENERAL
        private Instant dueDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateStatusRequest {
        @NotBlank(message = "Status is required")
        @jakarta.validation.constraints.Pattern(regexp = "TODO|IN_PROGRESS|COMPLETED", message = "Invalid task status")
        private String status; // TODO, IN_PROGRESS, COMPLETED
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TaskResponse {
        private Long id;
        private Long companyId;
        private String companyName;
        private Long creatorUserId;
        private String creatorName;
        private Long assignedToUserId;
        private String assignedToName;
        private String title;
        private String description;
        private String priority;
        private String category;
        private String status;
        private Instant dueDate;
        private Instant completedAt;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TaskStatsResponse {
        private long totalTasks;
        private long completedTasks;
        private long inProgressTasks;
        private long todoTasks;
        private double completionRate;
    }
}
