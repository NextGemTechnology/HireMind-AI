package com.talentiq.common.enums;

/**
 * Status of an individual payment transaction.
 */
public enum PaymentTransactionStatus {
    /** Order created, awaiting payment. */
    CREATED,
    /** Payment authorized by gateway, awaiting capture. */
    AUTHORIZED,
    /** Payment successfully captured. */
    CAPTURED,
    /** Payment failed or was declined. */
    FAILED,
    /** Payment was refunded. */
    REFUNDED
}
