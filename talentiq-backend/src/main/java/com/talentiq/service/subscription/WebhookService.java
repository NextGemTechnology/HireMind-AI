package com.talentiq.service.subscription;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.razorpay.Utils;
import com.talentiq.common.enums.BillingCycle;
import com.talentiq.common.enums.GatewayProvider;
import com.talentiq.common.enums.PaymentTransactionStatus;
import com.talentiq.common.enums.SubscriptionStatus;
import com.talentiq.config.PaymentConfig;
import com.talentiq.model.PaymentTransaction;
import com.talentiq.model.Subscription;
import com.talentiq.model.WebhookEvent;
import com.talentiq.repository.subscription.PaymentTransactionRepository;
import com.talentiq.repository.subscription.SubscriptionRepository;
import com.talentiq.repository.subscription.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final PaymentConfig paymentConfig;
    private final WebhookEventRepository webhookEventRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void handleRazorpayWebhook(String payload, String signature) {
        log.info("Processing Razorpay webhook...");

        // 1. Verify webhook signature if webhook secret is configured
        String webhookSecret = paymentConfig.getRazorpay() != null ? paymentConfig.getRazorpay().getWebhookSecret() : null;
        if (StringUtils.hasText(webhookSecret)) {
            if (!StringUtils.hasText(signature)) {
                log.error("Missing Razorpay webhook signature header X-Razorpay-Signature");
                throw new IllegalArgumentException("Missing webhook signature");
            }
            try {
                boolean isValid = Utils.verifyWebhookSignature(payload, signature, webhookSecret);
                if (!isValid) {
                    log.error("Invalid Razorpay webhook signature");
                    throw new IllegalArgumentException("Invalid webhook signature");
                }
            } catch (Exception e) {
                log.error("Failed to verify Razorpay webhook signature", e);
                throw new IllegalArgumentException("Signature verification error", e);
            }
        }

        // 2. Parse payload JSON
        JsonNode rootNode;
        try {
            rootNode = objectMapper.readTree(payload);
        } catch (Exception e) {
            log.error("Failed to parse webhook JSON payload", e);
            throw new IllegalArgumentException("Malformed JSON payload", e);
        }

        String eventId = rootNode.has("event_id") ? rootNode.get("event_id").asText() : 
                         rootNode.has("id") ? rootNode.get("id").asText() : null;
        String eventType = rootNode.has("event") ? rootNode.get("event").asText() : "unknown";

        if (!StringUtils.hasText(eventId)) {
            // Generate fallback eventId if not present
            eventId = "evt_" + Instant.now().toEpochMilli() + "_" + Math.abs(payload.hashCode());
        }

        // 3. Idempotency check: Ignore duplicate events
        if (webhookEventRepository.existsByEventId(eventId)) {
            log.info("Webhook event {} already processed. Skipping duplicate.", eventId);
            return;
        }

        WebhookEvent webhookEvent = WebhookEvent.builder()
                .eventId(eventId)
                .gatewayProvider(GatewayProvider.RAZORPAY)
                .eventType(eventType)
                .payloadJson(payload)
                .processed(false)
                .build();

        try {
            // 4. Process event types
            switch (eventType) {
                case "payment.captured":
                case "order.paid":
                    processPaymentCaptured(rootNode);
                    break;
                case "payment.failed":
                    processPaymentFailed(rootNode);
                    break;
                default:
                    log.info("Unhandled webhook event type: {}", eventType);
                    break;
            }

            webhookEvent.setProcessed(true);
            webhookEvent.setProcessedAt(Instant.now());
        } catch (Exception ex) {
            log.error("Error processing webhook event {}: {}", eventId, ex.getMessage(), ex);
            webhookEvent.setErrorMessage(ex.getMessage());
            webhookEvent.setProcessed(false);
        } finally {
            webhookEventRepository.save(webhookEvent);
        }
    }

    private void processPaymentCaptured(JsonNode rootNode) {
        JsonNode payloadNode = rootNode.path("payload");
        JsonNode paymentEntity = payloadNode.path("payment").path("entity");
        JsonNode orderEntity = payloadNode.path("order").path("entity");

        String gatewayOrderId = paymentEntity.has("order_id") && !paymentEntity.get("order_id").isNull() 
                ? paymentEntity.get("order_id").asText() 
                : orderEntity.has("id") ? orderEntity.get("id").asText() : null;

        String gatewayPaymentId = paymentEntity.has("id") ? paymentEntity.get("id").asText() : null;

        log.info("Handling payment captured for gatewayOrderId: {}, paymentId: {}", gatewayOrderId, gatewayPaymentId);

        if (!StringUtils.hasText(gatewayOrderId)) {
            log.warn("Cannot find gatewayOrderId in payment.captured payload");
            return;
        }

        Optional<PaymentTransaction> optTx = transactionRepository.findByGatewayOrderId(gatewayOrderId);
        if (optTx.isEmpty()) {
            log.warn("No local transaction found for gatewayOrderId: {}", gatewayOrderId);
            return;
        }

        PaymentTransaction tx = optTx.get();
        if (tx.getStatus() == PaymentTransactionStatus.CAPTURED) {
            log.info("Transaction {} already CAPTURED. No action required.", tx.getOrderId());
            return;
        }

        tx.setStatus(PaymentTransactionStatus.CAPTURED);
        if (StringUtils.hasText(gatewayPaymentId)) {
            tx.setGatewayPaymentId(gatewayPaymentId);
        }

        Long userId = tx.getUser().getId();

        // Deactivate existing active subscription
        subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE)
                .ifPresent(existing -> {
                    existing.setStatus(SubscriptionStatus.CANCELLED);
                    existing.setCancelledAt(Instant.now());
                    existing.setCancelReason("Replaced by webhook activation for order " + tx.getOrderId());
                    subscriptionRepository.save(existing);
                });

        // Activate new subscription
        Instant now = Instant.now();
        Instant periodEnd = tx.getPlan().getBillingCycle() == BillingCycle.YEARLY
                ? now.plus(365, ChronoUnit.DAYS)
                : now.plus(30, ChronoUnit.DAYS);

        Subscription subscription = Subscription.builder()
                .user(tx.getUser())
                .plan(tx.getPlan())
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(now)
                .currentPeriodEnd(periodEnd)
                .autoRenew(true)
                .build();

        subscription = subscriptionRepository.save(subscription);
        tx.setSubscription(subscription);
        transactionRepository.save(tx);

        log.info("Successfully activated subscription {} for user {} via webhook", subscription.getId(), userId);
    }

    private void processPaymentFailed(JsonNode rootNode) {
        JsonNode paymentEntity = rootNode.path("payload").path("payment").path("entity");
        String gatewayOrderId = paymentEntity.has("order_id") ? paymentEntity.get("order_id").asText() : null;
        String errorDescription = paymentEntity.has("error_description") ? paymentEntity.get("error_description").asText() : "Payment failed at gateway";

        if (StringUtils.hasText(gatewayOrderId)) {
            transactionRepository.findByGatewayOrderId(gatewayOrderId).ifPresent(tx -> {
                if (tx.getStatus() != PaymentTransactionStatus.CAPTURED) {
                    tx.setStatus(PaymentTransactionStatus.FAILED);
                    tx.setErrorMessage(errorDescription);
                    transactionRepository.save(tx);
                    log.info("Marked transaction {} as FAILED via webhook: {}", tx.getOrderId(), errorDescription);
                }
            });
        }
    }
}
