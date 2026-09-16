package com.talentiq.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.razorpay.Utils;
import com.talentiq.payment.config.PaymentConfig;
import com.talentiq.payment.enums.BillingCycle;
import com.talentiq.payment.enums.GatewayProvider;
import com.talentiq.payment.enums.PaymentTransactionStatus;
import com.talentiq.payment.enums.SubscriptionStatus;
import com.talentiq.payment.model.PaymentTransaction;
import com.talentiq.payment.model.Subscription;
import com.talentiq.payment.model.WebhookEvent;
import com.talentiq.payment.repository.PaymentTransactionRepository;
import com.talentiq.payment.repository.SubscriptionRepository;
import com.talentiq.payment.repository.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
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
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
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
            eventId = "evt_" + Instant.now().toEpochMilli() + "_" + Math.abs(payload.hashCode());
        }

        // 3. Distributed Redis lock for Webhook event
        String lockKey = "lock:sub:webhook:" + eventId;
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "LOCKED", Duration.ofSeconds(60));
        if (Boolean.FALSE.equals(acquired)) {
            log.info("Webhook event {} is currently being processed by another worker. Skipping.", eventId);
            return;
        }

        try {
            // 4. Idempotency check: Ignore duplicate events
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
                // 5. Process event types
                switch (eventType) {
                    case "payment.captured":
                    case "order.paid":
                        processPaymentCaptured(rootNode);
                        break;
                    case "payment.authorized":
                        processPaymentAuthorized(rootNode);
                        break;
                    case "payment.failed":
                        processPaymentFailed(rootNode);
                        break;
                    case "refund.processed":
                        processRefundProcessed(rootNode);
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
        } finally {
            redisTemplate.delete(lockKey);
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
        String method = paymentEntity.has("method") ? paymentEntity.get("method").asText() : null;

        log.info("Handling payment captured for gatewayOrderId: {}, paymentId: {}, method: {}", 
                gatewayOrderId, gatewayPaymentId, method);

        if (!StringUtils.hasText(gatewayOrderId)) {
            log.warn("Cannot find gatewayOrderId in payment.captured payload");
            return;
        }

        Optional<PaymentTransaction> optTx = transactionRepository.findByGatewayOrderIdForUpdate(gatewayOrderId)
                .or(() -> transactionRepository.findByGatewayOrderId(gatewayOrderId));
        if (optTx.isEmpty()) {
            log.warn("No local transaction found for gatewayOrderId: {}", gatewayOrderId);
            return;
        }

        PaymentTransaction tx = optTx.get();
        if (tx.getStatus().isSuccessful()) {
            log.info("Transaction {} already successful (status: {}). Updating payment details if missing.", 
                    tx.getOrderId(), tx.getStatus());
            updatePaymentDetailsIfMissing(tx, paymentEntity, gatewayPaymentId, method);
            return;
        }

        tx.setStatus(PaymentTransactionStatus.PAID);
        if (StringUtils.hasText(gatewayPaymentId)) {
            tx.setGatewayPaymentId(gatewayPaymentId);
        }
        updatePaymentDetailsIfMissing(tx, paymentEntity, gatewayPaymentId, method);

        Long userId = tx.getUser().getId();

        // Invalidate Redis active subscription cache
        redisTemplate.delete("sub:active:" + userId);

        // Deactivate existing active subscription with row lock
        subscriptionRepository.findByUserIdAndStatusWithPlanForUpdate(userId, SubscriptionStatus.ACTIVE)
                .or(() -> subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE))
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

    private void processPaymentAuthorized(JsonNode rootNode) {
        JsonNode paymentEntity = rootNode.path("payload").path("payment").path("entity");
        String gatewayOrderId = paymentEntity.has("order_id") ? paymentEntity.get("order_id").asText() : null;
        String gatewayPaymentId = paymentEntity.has("id") ? paymentEntity.get("id").asText() : null;

        if (StringUtils.hasText(gatewayOrderId)) {
            transactionRepository.findByGatewayOrderId(gatewayOrderId).ifPresent(tx -> {
                if (tx.getStatus() == PaymentTransactionStatus.CREATED || tx.getStatus() == PaymentTransactionStatus.PENDING) {
                    tx.setStatus(PaymentTransactionStatus.AUTHORIZED);
                    if (StringUtils.hasText(gatewayPaymentId)) {
                        tx.setGatewayPaymentId(gatewayPaymentId);
                    }
                    transactionRepository.save(tx);
                    log.info("Updated transaction {} to AUTHORIZED via webhook", tx.getOrderId());
                }
            });
        }
    }

    private void processPaymentFailed(JsonNode rootNode) {
        JsonNode paymentEntity = rootNode.path("payload").path("payment").path("entity");
        String gatewayOrderId = paymentEntity.has("order_id") ? paymentEntity.get("order_id").asText() : null;
        String errorDescription = paymentEntity.has("error_description") ? paymentEntity.get("error_description").asText() : "Payment failed at gateway";

        if (StringUtils.hasText(gatewayOrderId)) {
            transactionRepository.findByGatewayOrderId(gatewayOrderId).ifPresent(tx -> {
                if (!tx.getStatus().isSuccessful()) {
                    tx.setStatus(PaymentTransactionStatus.FAILED);
                    tx.setErrorMessage(errorDescription);
                    transactionRepository.save(tx);
                    log.info("Marked transaction {} as FAILED via webhook: {}", tx.getOrderId(), errorDescription);
                }
            });
        }
    }

    private void processRefundProcessed(JsonNode rootNode) {
        JsonNode paymentEntity = rootNode.path("payload").path("payment").path("entity");
        String gatewayOrderId = paymentEntity.has("order_id") ? paymentEntity.get("order_id").asText() : null;

        if (StringUtils.hasText(gatewayOrderId)) {
            (transactionRepository.findByGatewayOrderIdForUpdate(gatewayOrderId)
                    .or(() -> transactionRepository.findByGatewayOrderId(gatewayOrderId)))
                    .ifPresent(tx -> {
                tx.setStatus(PaymentTransactionStatus.REFUNDED);
                if (tx.getSubscription() != null) {
                    Subscription sub = tx.getSubscription();
                    sub.setStatus(SubscriptionStatus.CANCELLED);
                    sub.setCancelledAt(Instant.now());
                    sub.setCancelReason("Refund processed at payment gateway");
                    subscriptionRepository.save(sub);
                    redisTemplate.delete("sub:active:" + tx.getUser().getId());
                }
                transactionRepository.save(tx);
                log.info("Marked transaction {} and related subscription as REFUNDED via webhook", tx.getOrderId());
            });
        }
    }

    private void updatePaymentDetailsIfMissing(PaymentTransaction tx, JsonNode paymentEntity, String gatewayPaymentId, String method) {
        if (!StringUtils.hasText(tx.getPaymentMethod()) && StringUtils.hasText(method)) {
            tx.setPaymentMethod(method.toUpperCase());
        }
        if (!StringUtils.hasText(tx.getMaskedDetails()) && method != null) {
            switch (method.toLowerCase()) {
                case "card":
                    JsonNode cardNode = paymentEntity.path("card");
                    if (!cardNode.isMissingNode()) {
                        String last4 = cardNode.path("last4").asText("");
                        String network = cardNode.path("network").asText("");
                        tx.setMaskedDetails((network + " •••• " + last4).trim());
                    }
                    break;
                case "upi":
                    String vpa = paymentEntity.path("vpa").asText("");
                    if (StringUtils.hasText(vpa)) {
                        tx.setMaskedDetails(vpa);
                    }
                    break;
                case "netbanking":
                    String bank = paymentEntity.path("bank").asText("");
                    if (StringUtils.hasText(bank)) {
                        tx.setMaskedDetails("NetBanking (" + bank + ")");
                    }
                    break;
                case "wallet":
                    String wallet = paymentEntity.path("wallet").asText("");
                    if (StringUtils.hasText(wallet)) {
                        tx.setMaskedDetails("Wallet (" + wallet + ")");
                    }
                    break;
                default:
                    break;
            }
        }
    }
}
