package com.talentiq.dto.employee;

import com.talentiq.common.enums.DisbursementType;
import com.talentiq.common.enums.SalaryStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

public class SalaryDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        @NotNull(message = "Employee ID is required")
        private Long employeeId;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        private BigDecimal amount;

        @Builder.Default
        private String currency = "INR";

        @NotBlank(message = "Period label is required (e.g. September 2026)")
        private String periodLabel;

        @Builder.Default
        private DisbursementType disbursementType = DisbursementType.MONTHLY_SALARY;

        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ApprovalDecisionRequest {
        private boolean approved;
        private String rejectionReason;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long id;
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private String employeeEmail;
        private Long companyId;
        private String companyName;
        private BigDecimal amount;
        private String currency;
        private String periodLabel;
        private DisbursementType disbursementType;
        private SalaryStatus status;
        private String submittedByName;
        private Instant submittedAt;
        private String approvedByName;
        private Instant approvedAt;
        private String rejectionReason;
        private String paymentProvider;
        private String transactionRef;
        private String paymentStatus;
        private Instant paidAt;
        private String paymentError;
        private String notes;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatsResponse {
        private BigDecimal totalDisbursedThisMonth;
        private long pendingApprovalsCount;
        private BigDecimal pendingApprovalsAmount;
        private long completedDisbursementsCount;
    }
}
