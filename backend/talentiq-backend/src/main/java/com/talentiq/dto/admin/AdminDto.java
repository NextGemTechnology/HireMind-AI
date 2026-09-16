package com.talentiq.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class AdminDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserStatusRequest {
        @NotNull(message = "Enabled status is required")
        private Boolean enabled;
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyVerificationRequest {
        @NotNull(message = "Approval status is required")
        private Boolean approved;
        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemMetricsResponse {
        private long totalUsers;
        private long activeUsers;
        private long lockedUsers;
        private long totalCompanies;
        private long verifiedCompanies;
        private long pendingCompanies;
        private long totalJobs;
        private long activeJobs;
        private long totalApplications;
        private long totalResumes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemporalJobMetricsResponse {
        private long jobsToday;
        private long jobsThisWeek;
        private long jobsThisMonth;
        private long jobsThisYear;
        private long totalJobs;
        private long activeJobs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModerationRequest {
        @NotNull(message = "Action flag is required")
        private Boolean blocked;
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditLogResponse {
        private Long id;
        private String action;
        private String entityName;
        private Long entityId;
        private String performedByEmail;
        private String details;
        private Instant timestamp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentQueryRequest {
        private String prompt;
        private String targetType;
        private Long targetId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentQueryResponse {
        private String reply;
        private String actionType;
        private Object data;
        private Instant timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDetailsResponse {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private String status;
        private List<String> roles;
        private boolean emailVerified;
        private Instant createdAt;
        private Instant lastLoginAt;
        private int loginAttempts;
        // Candidate profile specific info
        private String headline;
        private String bio;
        private String location;
        private Boolean openToWork;
        private List<String> skills;
        private List<CandidateEducationDto> educations;
        private List<CandidateExperienceDto> experiences;
        // HR profile specific info
        private String companyName;
        private String designation;
        private boolean companyAdmin;
        private long totalApplicationsCount;
        private List<String> verifiedBadges;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateEducationDto {
        private Long id;
        private String institution;
        private String degree;
        private String fieldOfStudy;
        private Integer startYear;
        private Integer endYear;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateExperienceDto {
        private Long id;
        private String company;
        private String title;
        private String location;
        private String description;
    }

    // ── Phase 1 / Phase 2 DTOs: AI Terminal, Developer Ops & MFA ──

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeveloperTerminalRequest {
        @NotBlank(message = "Tool name is required")
        private String tool; // READ_LOGS, READ_METRICS, CHECK_API, CHECK_DATABASE, ANALYZE_QUERY, CHECK_DEPLOYMENT
        private String query;
        private Map<String, Object> params;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeveloperTerminalResponse {
        private String tool;
        private String status; // SUCCESS, ERROR, REQUIRES_APPROVAL
        private String summary;
        private Object output;
        private Instant executedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeveloperInviteRequest {
        @NotBlank(message = "Developer email is required")
        private String email;
        private String firstName;
        private String lastName;
        private String department;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MfaVerifyRequest {
        @NotBlank(message = "6-digit TOTP code is required")
        private String code;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeveloperOpsDashboardResponse {
        private Map<String, Object> presence;
        private Map<String, Object> systemHealth;
        private Map<String, Object> dbHealth;
        private Map<String, Object> securityAlerts;
        private List<Map<String, Object>> activeDevelopers;
        private Instant generatedAt;
    }
}
