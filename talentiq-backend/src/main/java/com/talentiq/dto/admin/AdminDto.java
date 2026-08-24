package com.talentiq.dto.admin;

import com.talentiq.dto.company.CompanyDto;
import com.talentiq.dto.user.UserDto;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

public class AdminDto {

    @Data
    public static class UserStatusRequest {
        @NotNull(message = "Enabled status is required")
        private Boolean enabled;
        private String reason;
    }

    @Data
    public static class CompanyVerificationRequest {
        @NotNull(message = "Approval status is required")
        private Boolean approved;
        private String notes;
    }

    @Data
    @Builder
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
    public static class TemporalJobMetricsResponse {
        private long jobsToday;
        private long jobsThisWeek;
        private long jobsThisMonth;
        private long jobsThisYear;
        private long totalJobs;
        private long activeJobs;
    }

    @Data
    public static class ModerationRequest {
        @NotNull(message = "Action flag is required")
        private Boolean blocked;
        private String reason;
    }

    @Data
    @Builder
    public static class AuditLogResponse {
        private Long id;
        private String action;
        private String entityName;
        private Long entityId;
        private String performedByEmail;
        private String details;
        private Instant timestamp;
    }
}
