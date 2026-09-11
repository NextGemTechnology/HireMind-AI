package com.talentiq.dto.subscription;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.talentiq.common.enums.BillingCycle;
import com.talentiq.common.enums.SubscriptionStatus;
import com.talentiq.common.enums.TargetRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class SubscriptionDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PlanResponse {
        private String planCode;
        private String name;
        private String description;
        private TargetRole targetRole;
        private BigDecimal priceAmount;
        private String currency;
        private BillingCycle billingCycle;
        private List<String> features;
        private Integer maxJobs;
        private Integer maxAiMatches;
        private boolean active;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InitiatePurchaseRequest {
        @NotBlank(message = "Plan code is required")
        private String planCode;

        @NotNull(message = "Billing cycle is required")
        private BillingCycle billingCycle;

        private String idempotencyKey; // Optional: auto-generated if missing
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateOrderResponse {
        private String orderId;         // Our internal order ID
        private String gatewayOrderId;  // Razorpay order ID
        private BigDecimal amount;
        private String currency;
        private String gatewayKeyId;    // For frontend to init checkout
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyPaymentRequest {
        @NotBlank(message = "Order ID is required")
        private String orderId;

        @NotBlank(message = "Gateway payment ID is required")
        private String gatewayPaymentId;

        @NotBlank(message = "Gateway signature is required")
        private String gatewaySignature;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SubscriptionResponse {
        private Long subscriptionId;
        private SubscriptionStatus status;
        private PlanResponse plan;
        private Instant currentPeriodStart;
        private Instant currentPeriodEnd;
        private boolean autoRenew;
        private Instant cancelledAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TransactionResponse {
        private String orderId;
        private String gatewayPaymentId;
        private BigDecimal amount;
        private String currency;
        private String status;
        private String planName;
        private Instant createdAt;
        private String errorMessage;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CancelRequest {
        private String reason;
    }
}
