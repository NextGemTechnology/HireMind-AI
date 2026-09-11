package com.talentiq.common.enums;

/**
 * Lifecycle status of a subscription.
 */
public enum SubscriptionStatus {
    /** Subscription is active and access is granted. */
    ACTIVE,
    /** Subscription has passed its period end date without renewal. */
    EXPIRED,
    /** User explicitly cancelled the subscription. */
    CANCELLED,
    /** Payment failed on renewal; grace period active. */
    PAST_DUE,
    /** Trial period (future use). */
    TRIALING
}
