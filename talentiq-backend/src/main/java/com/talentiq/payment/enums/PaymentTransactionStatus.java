package com.talentiq.payment.enums;

/**
 * Payment transaction status across lifecycle states.
 */
public enum PaymentTransactionStatus {
    CREATED,
    PENDING,
    PROCESSING,
    AUTHORIZED,
    CAPTURED,
    PAID,
    FAILED,
    REFUNDED,
    CANCELLED,
    EXPIRED;

    /**
     * Check if the status indicates a successful payment.
     */
    public boolean isSuccessful() {
        return this == CAPTURED || this == PAID;
    }

    /**
     * Check if the transaction is in a terminal (non-updatable) state.
     */
    public boolean isTerminal() {
        return this == CAPTURED || this == PAID || this == FAILED || this == CANCELLED || this == EXPIRED;
    }
}
