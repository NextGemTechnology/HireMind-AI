package com.talentiq.dto.developer;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class DeveloperWorkspaceDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EligibilityResponse {
        private boolean eligible;
        private String verifiedStatus; // VERIFIED, PENDING, NONE
        private String employmentStatus; // ACTIVE, PENDING_VERIFICATION, SUSPENDED, TERMINATED, NONE
        private boolean workspaceAccess;
        private Long companyId;
        private String companyName;
        private String companyLogoUrl;
        private String jobTitle;
        private String department;
        private String employeeCode;
        private String badgeCertificateId;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EmployeeInfo {
        private Long employeeId;
        private Long companyId;
        private String companyName;
        private String companyLogoUrl;
        private String jobTitle;
        private String department;
        private String employeeCode;
        private String employmentType;
        private LocalDate joinDate;
        private Instant verifiedAt;
        private String badgeCertificateId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TaskItem {
        private Long id;
        private String taskCode;
        private String title;
        private String description;
        private String priority; // HIGH, MEDIUM, LOW
        private String status; // TODO, IN_PROGRESS, COMPLETED
        private String category;
        private Instant dueDate;
        private Instant completedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SprintInfo {
        private String name;
        private String status; // In Progress, Planned, Completed
        private String startDate;
        private String endDate;
        private String description;
        private int completedTasks;
        private int totalTasks;
        private int progressPercentage;
        private List<String> focusTags;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyUpdateItem {
        private Long id;
        private String workSummary;
        private String blockers;
        private Instant submittedAt;
        private String dateStr;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChannelItem {
        private Long id;
        private String name;
        private String description;
        private int unreadCount;
        private String activityStatus; // e.g. "Active now - 12 new messages"
        private boolean isPrivate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PerformanceMetric {
        private int tasksCompleted;
        private String tasksCompletedPeriod;
        private String avgResponseTime;
        private String avgResponsePeriod;
        private String sprintStatus;
        private String sprintStatusNote;
        private String managerRating;
        private String managerRatingPeriod;
        private String motivationalQuote;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OverviewResponse {
        private EmployeeInfo employee;
        private List<TaskItem> todayTasks;
        private SprintInfo currentSprint;
        private DailyUpdateItem todayDailyUpdate;
        private List<ChannelItem> teamChannels;
        private PerformanceMetric performance;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubmitDailyUpdateRequest {
        @NotBlank(message = "Work summary cannot be blank")
        private String workSummary;
        private String blockers;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateTaskStatusRequest {
        @NotBlank(message = "Status is required")
        private String status; // TODO, IN_PROGRESS, COMPLETED
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProjectItem {
        private Long id;
        private String name;
        private String description;
        private String repoUrl;
        private String techStack;
        private String status;
        private int openIssues;
        private int activePullRequests;
    }
}
