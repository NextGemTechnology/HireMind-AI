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

    /**
     * Validates whether a state transition is legal according to lifecycle invariants.
     */
    public boolean canTransitionTo(PaymentTransactionStatus target) {
        if (this == target) return true;
        return switch (this) {
            case CREATED -> target == PENDING || target == AUTHORIZED || target == PROCESSING || target == FAILED || target == CANCELLED || target == EXPIRED;
            case PENDING -> target == AUTHORIZED || target == PROCESSING || target == PAID || target == CAPTURED || target == FAILED || target == CANCELLED || target == EXPIRED;
            case AUTHORIZED -> target == PROCESSING || target == PAID || target == CAPTURED || target == FAILED || target == CANCELLED;
            case PROCESSING -> target == PAID || target == CAPTURED || target == FAILED || target == EXPIRED;
            case PAID -> target == CAPTURED || target == REFUNDED;
            case CAPTURED -> target == REFUNDED;
            case FAILED, CANCELLED, EXPIRED, REFUNDED -> false;
        };
    }
}
