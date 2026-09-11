package com.talentiq.common.enums;

/**
 * Status of an individual payment transaction.
 */
public enum PaymentTransactionStatus {
    /** Order created, awaiting payment. */
    CREATED,
    /** Payment pending processing or awaiting 3D Secure / OTP. */
    PENDING,
    /** Payment authorized by gateway, awaiting capture. */
    AUTHORIZED,
    /** Payment successfully verified and paid. */
    PAID,
    /** Payment successfully captured. */
    CAPTURED,
    /** Payment failed or was declined. */
    FAILED,
    /** Payment was cancelled or dismissed by user. */
    CANCELLED,
    /** Payment was refunded. */
    REFUNDED;

    public boolean isSuccessful() {
        return this == PAID || this == CAPTURED;
    }

    public boolean isTerminal() {
        return this == PAID || this == CAPTURED || this == FAILED || this == CANCELLED || this == REFUNDED;
    }
}
