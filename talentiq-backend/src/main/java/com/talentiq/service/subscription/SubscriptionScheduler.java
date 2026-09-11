package com.talentiq.service.subscription;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionScheduler {

    private final SubscriptionService subscriptionService;

    /**
     * Periodically check and expire subscriptions that have passed their current period end date.
     * Runs every hour (at the top of the hour).
     */
    @Scheduled(cron = "0 0 * * * *")
    public void scheduleSubscriptionExpiry() {
        log.debug("Running scheduled check for expired subscriptions...");
        try {
            subscriptionService.expireOverdueSubscriptions();
        } catch (Exception e) {
            log.error("Error occurred while expiring overdue subscriptions", e);
        }
    }
}
