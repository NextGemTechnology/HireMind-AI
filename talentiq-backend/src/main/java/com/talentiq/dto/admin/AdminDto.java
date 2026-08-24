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

    @Data
    public static class AgentQueryRequest {
        private String prompt;
        private String targetType;
        private Long targetId;
    }

    @Data
    @Builder
    public static class AgentQueryResponse {
        private String reply;
        private String actionType;
        private Object data;
        private Instant timestamp;
    }

    @Data
    @Builder
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
        // Candidate profile specific info if exists
        private String headline;
        private String bio;
        private String location;
        private Boolean openToWork;
        private List<String> skills;
        private List<CandidateEducationDto> educations;
        private List<CandidateExperienceDto> experiences;
        // HR profile specific info if exists
        private String companyName;
        private String designation;
        private boolean companyAdmin;
        private long totalApplicationsCount;
        private List<String> verifiedBadges;
    }

    @Data
    @Builder
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
    public static class CandidateExperienceDto {
        private Long id;
        private String company;
        private String title;
        private String location;
        private String description;
    }
}
