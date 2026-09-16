package com.talentiq.events;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedEvent extends DomainEvent {

    private String transactionId;
    private String orderId;
    private Long userId;
    private String userEmail;
    private Long companyId;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private Long planId;
    private String planName;
}
