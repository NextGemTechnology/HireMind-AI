package com.talentiq.infrastructure.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResult {
    private String transactionRef;
    private PaymentStatus status;
    private String errorMessage;
    private Instant timestamp;

    public static PaymentResult success(String transactionRef) {
        return PaymentResult.builder()
                .transactionRef(transactionRef)
                .status(PaymentStatus.SUCCESS)
                .timestamp(Instant.now())
                .build();
    }

    public static PaymentResult failed(String errorMessage) {
        return PaymentResult.builder()
                .status(PaymentStatus.FAILED)
                .errorMessage(errorMessage)
                .timestamp(Instant.now())
                .build();
    }
}
