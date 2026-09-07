package com.talentiq.dto.employee;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.enums.EmploymentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class EmployeeDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OnboardRequest {
        @NotNull(message = "Candidate user ID is required")
        private Long candidateUserId;

        @NotBlank(message = "Job title is required")
        private String jobTitle;

        private String department;

        @Builder.Default
        private EmploymentType employmentType = EmploymentType.FULL_TIME;

        private LocalDate joinDate;

        @DecimalMin(value = "0.00", message = "Base salary must be non-negative")
        private BigDecimal baseSalary;

        @Builder.Default
        private String salaryCurrency = "INR";

        @Builder.Default
        private String salaryPeriod = "MONTHLY";

        private String employeeCode;
        private String notes;
        private Long verificationId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateRequest {
        private String jobTitle;
        private String department;
        private EmploymentType employmentType;
        private BigDecimal baseSalary;
        private String salaryCurrency;
        private String salaryPeriod;
        private String employeeCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerificationDecisionRequest {
        private boolean approved;
        private String rejectionReason;
        private String employeeCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TerminationRequest {
        @NotBlank(message = "Termination reason is required")
        private String reason;

        @Builder.Default
        private Integer noticePeriodDays = 30;

        private LocalDate lastWorkingDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TerminationDecisionRequest {
        private boolean approved;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SuspendRequest {
        @NotBlank(message = "Suspension reason is required")
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long id;
        private Long companyId;
        private String companyName;
        private String companyLogoUrl;
        private Long userId;
        private String candidateName;
        private String candidateEmail;
        private String candidateAvatarUrl;
        private Long hrProfileId;
        private String hrName;
        private String employeeCode;
        private String jobTitle;
        private String department;
        private EmploymentType employmentType;
        private EmployeeStatus status;
        private LocalDate joinDate;
        private Instant verifiedAt;
        private String verifiedByName;
        private String rejectionReason;
        private String terminationStatus;
        private String terminationReason;
        private Integer noticePeriodDays;
        private LocalDate lastWorkingDate;
        private Instant terminatedAt;
        private String terminatedByName;
        private BigDecimal baseSalary;
        private String salaryCurrency;
        private String salaryPeriod;
        private String badgeCertificateId;
        private Instant createdAt;
        private Instant updatedAt;
        private List<StatusHistoryResponse> statusHistory;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatusHistoryResponse {
        private Long id;
        private EmployeeStatus fromStatus;
        private EmployeeStatus toStatus;
        private String changedByName;
        private String notes;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DashboardStatsResponse {
        private long totalEmployees;
        private long activeEmployees;
        private long pendingVerifications;
        private long onNoticeEmployees;
        private long terminatedEmployees;
        private long pendingTerminations;
    }
}
