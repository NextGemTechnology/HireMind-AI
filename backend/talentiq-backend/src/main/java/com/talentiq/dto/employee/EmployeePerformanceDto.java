package com.talentiq.dto.employee;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class EmployeePerformanceDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "Employee ID is required")
        private Long employeeId;

        @NotBlank(message = "Review period is required (e.g. Q3 2026)")
        private String reviewPeriod;

        @NotNull(message = "Rating is required")
        @DecimalMin(value = "1.00", message = "Rating must be between 1.00 and 5.00")
        @DecimalMax(value = "5.00", message = "Rating must be between 1.00 and 5.00")
        private BigDecimal rating;

        private String ratingCategory; // EXCELLENT, GOOD, AVERAGE, NEEDS_IMPROVEMENT

        private String feedback;

        private String goalsOkrs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long companyId;
        private Long employeeId;
        private String employeeName;
        private String employeeEmail;
        private String employeeCode;
        private String jobTitle;
        private String department;
        private Long reviewerUserId;
        private String reviewerName;
        private String reviewPeriod;
        private BigDecimal rating;
        private String ratingCategory;
        private String feedback;
        private String goalsOkrs;
        private Instant reviewedAt;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PerformanceStatsResponse {
        private long totalReviews;
        private double averageRating;
        private long excellentCount;
        private long goodCount;
        private long averageCount;
        private long needsImprovementCount;
        private List<MonthlyTrendItem> monthlyTrends;
        private List<DepartmentRatingItem> departmentRatings;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTrendItem {
        private String month;
        private int excellent;
        private int good;
        private int average;
        private int needsImprovement;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentRatingItem {
        private String department;
        private double averageScore;
        private long count;
    }
}
