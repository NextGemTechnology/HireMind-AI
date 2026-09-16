package com.talentiq.payment.service;

import lombok.Builder;

import java.math.BigDecimal;

/**
 * Normalized payment details retrieved from the payment gateway (Razorpay or Mock).
 * Card details, CVV, and UPI PINs are NEVER present here.
 */
@Builder
public record PaymentDetails(
        String paymentId,
        String orderId,
        String status, // e.g. "captured", "authorized", "failed"
        BigDecimal amount, // Amount in standard currency units (e.g. INR 99.00)
        String currency,
        String paymentMethod, // e.g. "CARD", "UPI", "NETBANKING", "WALLET"
        String maskedDetails, // e.g. "•••• 4242 (Visa)" or "candidate@okhdfcbank"
        String errorCode,
        String errorDescription
) {
}
