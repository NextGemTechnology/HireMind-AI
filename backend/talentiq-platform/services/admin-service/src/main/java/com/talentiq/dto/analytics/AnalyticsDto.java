package com.talentiq.dto.analytics;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class AnalyticsDto {

    @Data
    public static class EventRequest {
        @NotBlank(message = "Event type is required")
        private String eventType;

        private String entityType;
        private Long entityId;
        private Map<String, Object> properties;
    }

    @Data
    @Builder
    public static class MonthlyStats {
        private String month;          // "Jan", "Feb", ...
        private long applications;
        private long shortlisted;
        private long rejected;
    }

    @Data
    @Builder
    public static class HrDashboardResponse {
        private Long companyId;
        private String companyName;
        private long activeJobsCount;
        private long totalApplicationsCount;
        private long shortlistedCount;
        private long hiredCandidatesCount;
        private BigDecimal conversionRate;
        private BigDecimal avgTimeToHireDays;
        private Map<String, Long> applicationsByStatus;
        private List<MonthlyStats> monthlyStats;
    }

    @Data
    @Builder
    public static class PlatformOverviewResponse {
        private long totalUsersCount;
        private long totalCandidatesCount;
        private long totalCompaniesCount;
        private long totalJobsCount;
        private long totalApplicationsCount;
        private long totalResumesUploadedCount;
    }

    @Data
    @Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PublicPlatformStatsResponse implements java.io.Serializable {
        private long activeCandidates;
        private String activeCandidatesFormatted;
        private long companiesHiring;
        private String companiesHiringFormatted;
        private long jobsLiveNow;
        private String jobsLiveNowFormatted;
        private double successRate;
        private String successRateFormatted;
        private long totalApplications;
        private long aiMatchesMade;
        private String cacheSource;
    }
}
