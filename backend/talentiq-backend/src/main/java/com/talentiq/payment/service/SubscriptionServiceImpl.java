package com.talentiq.payment.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.BusinessException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.model.User;
import com.talentiq.payment.config.PaymentConfig;
import com.talentiq.payment.dto.SubscriptionDto.*;
import com.talentiq.payment.enums.BillingCycle;
import com.talentiq.payment.enums.GatewayProvider;
import com.talentiq.payment.enums.PaymentTransactionStatus;
import com.talentiq.payment.enums.SubscriptionStatus;
import com.talentiq.payment.enums.TargetRole;
import com.talentiq.payment.model.PaymentTransaction;
import com.talentiq.payment.model.Subscription;
import com.talentiq.payment.model.SubscriptionPlan;
import com.talentiq.payment.repository.PaymentTransactionRepository;
import com.talentiq.payment.repository.SubscriptionPlanRepository;
import com.talentiq.payment.repository.SubscriptionRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionServiceImpl implements SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final PaymentConfig paymentConfig;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PlanResponse> getPlans(TargetRole targetRole) {
        List<SubscriptionPlan> plans = targetRole != null 
                ? planRepository.findByTargetRoleAndActiveTrueOrderByDisplayOrderAsc(targetRole)
                : planRepository.findByActiveTrueOrderByDisplayOrderAsc();
                
        return plans.stream().map(this::mapToPlanResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PlanResponse getPlanByCode(String planCode) {
        SubscriptionPlan plan = planRepository.findByPlanCode(planCode)
                .orElseThrow(() -> new ResourceNotFoundException("SubscriptionPlan", "planCode", planCode));
        return mapToPlanResponse(plan);
    }

    @Override
    @Transactional(readOnly = true)
    public SubscriptionResponse getMySubscription(Long userId) {
        String cacheKey = "sub:active:" + userId;
        try {
            String cachedJson = redisTemplate.opsForValue().get(cacheKey);
            if (StringUtils.hasText(cachedJson)) {
                return objectMapper.readValue(cachedJson, SubscriptionResponse.class);
            }
        } catch (Exception e) {
            log.warn("Failed to read cached subscription for user {}", userId, e);
        }

        // Find active subscription
        Optional<Subscription> optSub = subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE);
        
        if (optSub.isEmpty()) {
            return null;
        }
        
        SubscriptionResponse response = mapToSubscriptionResponse(optSub.get());
        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(response), Duration.ofHours(1));
        } catch (Exception e) {
            log.warn("Failed to cache subscription for user {}", userId, e);
        }
        return response;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public CreateOrderResponse initiatePurchase(Long userId, InitiatePurchaseRequest request) {
        String lockKey = "lock:sub:order:" + userId;
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "LOCKED", Duration.ofSeconds(10));
        if (Boolean.FALSE.equals(acquired)) {
            throw new ConflictException("Another order initiation is in progress. Please wait a moment.");
        }

        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
                    
            SubscriptionPlan plan = planRepository.findByPlanCode(request.getPlanCode())
                    .orElseThrow(() -> new ResourceNotFoundException("SubscriptionPlan", "planCode", request.getPlanCode()));

            if (!plan.isActive()) {
                throw new BadRequestException("This plan is no longer available for purchase");
            }

            // RBAC Check: Ensure user role matches the target role of the subscription plan
            boolean roleAllowed = switch (plan.getTargetRole()) {
                case CANDIDATE -> user.hasRole(Role.ROLE_CANDIDATE);
                case HR -> user.hasRole(Role.ROLE_HR);
                case COMPANY -> user.hasRole(Role.ROLE_COMPANY_ADMIN);
            };
            if (!roleAllowed) {
                throw new ForbiddenException("Your account role does not permit purchasing a " + plan.getTargetRole() + " plan");
            }
            
            // Prevent active subscribers from purchasing the exact same plan without canceling
            Optional<Subscription> activeSub = subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE);
            if (activeSub.isPresent() && activeSub.get().getPlan().getId().equals(plan.getId())) {
                throw new ConflictException("You already have an active subscription to this plan");
            }

            String idempotencyKey = StringUtils.hasText(request.getIdempotencyKey()) 
                    ? request.getIdempotencyKey() 
                    : UUID.randomUUID().toString();

            // Check idempotency
            Optional<PaymentTransaction> existingTx = transactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existingTx.isPresent()) {
                PaymentTransaction tx = existingTx.get();
                if (tx.getStatus() == PaymentTransactionStatus.CREATED || tx.getStatus() == PaymentTransactionStatus.PENDING) {
                    return CreateOrderResponse.builder()
                            .orderId(tx.getOrderId())
                            .gatewayOrderId(tx.getGatewayOrderId())
                            .amount(tx.getAmount())
                            .currency(tx.getCurrency())
                            .gatewayKeyId(resolveGatewayKeyId())
                            .build();
                }
                throw new ConflictException("This idempotency key has already been used for a processed transaction");
            }

            // 1. Create local transaction record
            String internalOrderId = "ord_" + UUID.randomUUID().toString().replace("-", "");
            
            PaymentTransaction transaction = PaymentTransaction.builder()
                    .orderId(internalOrderId)
                    .user(user)
                    .plan(plan)
                    .amount(plan.getPriceAmount())
                    .currency(plan.getCurrency())
                    .status(PaymentTransactionStatus.CREATED)
                    .gatewayProvider(GatewayProvider.valueOf(paymentGatewayService.getProviderName()))
                    .idempotencyKey(idempotencyKey)
                    .build();
                    
            transactionRepository.save(transaction);
            
            // 2. Call Gateway to create order
            CreateOrderResponse response = paymentGatewayService.createOrder(transaction);
            
            // 3. Update transaction with gateway ID and ensure keyId is populated
            transaction.setGatewayOrderId(response.getGatewayOrderId());
            transactionRepository.save(transaction);

            if (!StringUtils.hasText(response.getGatewayKeyId())) {
                response.setGatewayKeyId(resolveGatewayKeyId());
            }
            
            return response;
        } finally {
            redisTemplate.delete(lockKey);
        }
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public CreateQrSessionResponse createQrPaymentSession(Long userId, String orderId) {
        PaymentTransaction tx = transactionRepository.findByOrderIdForUpdate(orderId)
                .or(() -> transactionRepository.findByOrderId(orderId))
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", "orderId", orderId));

        if (!tx.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Order does not belong to the current user");
        }

        if (tx.getStatus().isTerminal()) {
            throw new BadRequestException("Transaction is in terminal status: " + tx.getStatus());
        }

        long ttlSeconds = 300L; // 5 minutes TTL
        long expiresAt = Instant.now().toEpochMilli() + (ttlSeconds * 1000L);
        String planCode = tx.getPlan().getPlanCode();
        String upiUri = String.format("upi://pay?pa=hiremind@icici&pn=HireMind+AI&am=%.2f&cu=INR&tr=%s&tn=HireMind+%s",
                tx.getAmount(), tx.getOrderId(), planCode);

        // Store session and flag in Redis with TTL
        String qrKey = "pay:qr:" + orderId;
        String flagKey = "pay:qr:flag:" + orderId;
        redisTemplate.opsForValue().set(qrKey, upiUri, Duration.ofSeconds(ttlSeconds));
        redisTemplate.opsForValue().set(flagKey, "ACTIVE", Duration.ofSeconds(ttlSeconds + 120)); // flag outlasts QR to detect expiration

        if (tx.getStatus() == PaymentTransactionStatus.CREATED) {
            tx.setStatus(PaymentTransactionStatus.PENDING);
            tx.setPaymentMethod("UPI");
            transactionRepository.save(tx);
        }

        return CreateQrSessionResponse.builder()
                .orderId(orderId)
                .upiUri(upiUri)
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .expiresAt(expiresAt)
                .ttlSeconds(ttlSeconds)
                .build();
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public PaymentSessionStatusResponse getPaymentSessionStatus(Long userId, String orderId) {
        PaymentTransaction tx = transactionRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", "orderId", orderId));

        if (!tx.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Order does not belong to the current user");
        }

        if (tx.getStatus().isSuccessful()) {
            return PaymentSessionStatusResponse.builder()
                    .orderId(orderId)
                    .status(tx.getStatus().name())
                    .expired(false)
                    .ttlRemainingSeconds(0)
                    .build();
        }

        String qrKey = "pay:qr:" + orderId;
        String flagKey = "pay:qr:flag:" + orderId;
        Long ttl = redisTemplate.getExpire(qrKey);
        boolean isFlagged = Boolean.TRUE.equals(redisTemplate.hasKey(flagKey));

        if (isFlagged && (ttl == null || ttl <= 0)) {
            if (tx.getStatus() == PaymentTransactionStatus.CREATED || tx.getStatus() == PaymentTransactionStatus.PENDING) {
                tx.setStatus(PaymentTransactionStatus.EXPIRED);
                tx.setErrorMessage("Payment QR code session expired");
                transactionRepository.save(tx);
            }
            return PaymentSessionStatusResponse.builder()
                    .orderId(orderId)
                    .status(PaymentTransactionStatus.EXPIRED.name())
                    .expired(true)
                    .ttlRemainingSeconds(0)
                    .build();
        }

        return PaymentSessionStatusResponse.builder()
                .orderId(orderId)
                .status(tx.getStatus().name())
                .expired(false)
                .ttlRemainingSeconds(ttl != null && ttl > 0 ? ttl : 0)
                .build();
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public SubscriptionResponse verifyAndActivate(Long userId, VerifyPaymentRequest request) {
        String lockKey = "lock:sub:verify:" + request.getOrderId();
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "LOCKED", Duration.ofSeconds(30));
        if (Boolean.FALSE.equals(acquired)) {
            throw new ConflictException("Payment verification is already being processed for this order.");
        }

        try {
            // Row-level lock on PaymentTransaction to guarantee Isolation
            PaymentTransaction tx = transactionRepository.findByOrderIdForUpdate(request.getOrderId())
                    .or(() -> transactionRepository.findByOrderId(request.getOrderId()))
                    .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", "orderId", request.getOrderId()));
                    
            if (!tx.getUser().getId().equals(userId)) {
                throw new ForbiddenException("Order does not belong to the current user");
            }
            
            if (tx.getStatus().isSuccessful()) {
                // Already processed idempotently
                return getMySubscription(userId);
            }

            if (tx.getStatus() == PaymentTransactionStatus.EXPIRED) {
                throw new BusinessException("PAYMENT_SESSION_EXPIRED", "Payment session has expired. Please initiate a new order.");
            }

            // Check if QR session was created and has expired
            String flagKey = "pay:qr:flag:" + request.getOrderId();
            if (Boolean.TRUE.equals(redisTemplate.hasKey(flagKey))) {
                Long qrTtl = redisTemplate.getExpire("pay:qr:" + request.getOrderId());
                if (qrTtl == null || qrTtl <= 0) {
                    tx.setStatus(PaymentTransactionStatus.EXPIRED);
                    tx.setErrorMessage("Payment QR code session expired");
                    transactionRepository.save(tx);
                    throw new BusinessException("PAYMENT_SESSION_EXPIRED", "Payment QR session has expired. Please generate a new QR code or retry.");
                }
            }
            
            if (!tx.getStatus().canTransitionTo(PaymentTransactionStatus.PROCESSING)) {
                throw new BadRequestException("Transaction is in an invalid state for verification: " + tx.getStatus());
            }

            // Move to PROCESSING state
            tx.setStatus(PaymentTransactionStatus.PROCESSING);
            if (StringUtils.hasText(request.getPaymentMethod())) {
                tx.setPaymentMethod(request.getPaymentMethod());
            }
            if (StringUtils.hasText(request.getMaskedDetails())) {
                tx.setMaskedDetails(request.getMaskedDetails());
            }
            transactionRepository.save(tx);

            // 1. Verify Gateway Signature
            boolean isSignatureValid = paymentGatewayService.verifyPaymentSignature(
                    tx.getGatewayOrderId(), 
                    request.getGatewayPaymentId(), 
                    request.getGatewaySignature()
            );
            
            if (!isSignatureValid) {
                tx.setStatus(PaymentTransactionStatus.FAILED);
                tx.setErrorMessage("Signature verification failed");
                transactionRepository.save(tx);
                throw new BusinessException("PAYMENT_VERIFICATION_FAILED", "Invalid payment signature");
            }

            // 2. Fetch payment details from gateway to verify amount, currency, and extract masked method info
            PaymentDetails paymentDetails = paymentGatewayService.fetchPaymentDetails(request.getGatewayPaymentId());
            if (paymentDetails != null) {
                // Verify amount match (never trust frontend amount)
                if (paymentDetails.amount() != null && paymentDetails.amount().compareTo(tx.getAmount()) != 0) {
                    log.error("Amount mismatch! Expected {} but gateway returned {}", tx.getAmount(), paymentDetails.amount());
                    tx.setStatus(PaymentTransactionStatus.FAILED);
                    tx.setErrorMessage("Payment amount mismatch with gateway");
                    transactionRepository.save(tx);
                    throw new BusinessException("AMOUNT_MISMATCH", "Paid amount does not match expected order amount");
                }
                if (StringUtils.hasText(paymentDetails.paymentMethod()) && !StringUtils.hasText(tx.getPaymentMethod())) {
                    tx.setPaymentMethod(paymentDetails.paymentMethod());
                }
                if (StringUtils.hasText(paymentDetails.maskedDetails()) && !StringUtils.hasText(tx.getMaskedDetails())) {
                    tx.setMaskedDetails(paymentDetails.maskedDetails());
                }
            }
            
            // 3. Mark Transaction as PAID (and CAPTURED)
            tx.setStatus(PaymentTransactionStatus.PAID);
            tx.setGatewayPaymentId(request.getGatewayPaymentId());
            tx.setGatewaySignature(request.getGatewaySignature());
            
            // 4. Cancel any existing active subscriptions (upgrade/replace flow) with row lock
            subscriptionRepository.findByUserIdAndStatusWithPlanForUpdate(userId, SubscriptionStatus.ACTIVE)
                .or(() -> subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE))
                .ifPresent(existing -> {
                    existing.setStatus(SubscriptionStatus.CANCELLED);
                    existing.setCancelledAt(Instant.now());
                    existing.setCancelReason("Replaced by new subscription " + tx.getOrderId());
                    subscriptionRepository.save(existing);
                });
                
            // 5. Create/Activate Subscription
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
            
            // Link transaction to subscription
            tx.setSubscription(subscription);
            transactionRepository.save(tx);
            
            // Cache invalidation: wipe active subscription cache & QR keys
            redisTemplate.delete("sub:active:" + userId);
            redisTemplate.delete("pay:qr:" + request.getOrderId());
            redisTemplate.delete("pay:qr:flag:" + request.getOrderId());

            log.info("Successfully verified and activated subscription {} for user {}", subscription.getId(), userId);
            return mapToSubscriptionResponse(subscription);
        } finally {
            redisTemplate.delete(lockKey);
        }
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public void cancelSubscription(Long userId, CancelRequest request) {
        Subscription sub = subscriptionRepository.findByUserIdAndStatusWithPlanForUpdate(userId, SubscriptionStatus.ACTIVE)
                .or(() -> subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE))
                .orElseThrow(() -> new BadRequestException("No active subscription found to cancel"));
                
        sub.setAutoRenew(false);
        sub.setStatus(SubscriptionStatus.CANCELLED);
        sub.setCancelledAt(Instant.now());
        sub.setCancelReason(request.getReason());
        
        subscriptionRepository.save(sub);
        // Cache invalidation
        redisTemplate.delete("sub:active:" + userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactionHistory(Long userId, PaymentTransactionStatus status, String search, Pageable pageable) {
        String trimmedSearch = StringUtils.hasText(search) ? search.trim() : null;
        return transactionRepository.findByUserIdWithFilters(userId, status, trimmedSearch, pageable)
                .map(this::mapToTransactionResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveSubscription(Long userId, String planCode) {
        return subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE)
                .map(s -> s.getPlan().getPlanCode().equals(planCode))
                .orElse(false);
    }

    @Override
    @Transactional
    public void expireOverdueSubscriptions() {
        // Find all ACTIVE subscriptions whose period end is in the past
        List<Subscription> expired = subscriptionRepository.findAllByCurrentPeriodEndBeforeAndStatus(
                Instant.now(), SubscriptionStatus.ACTIVE);
                
        for (Subscription sub : expired) {
            sub.setStatus(SubscriptionStatus.EXPIRED);
            redisTemplate.delete("sub:active:" + sub.getUser().getId());
            log.info("Expired subscription {} for user {}", sub.getId(), sub.getUser().getId());
        }
        
        if (!expired.isEmpty()) {
            subscriptionRepository.saveAll(expired);
        }
    }

    private String resolveGatewayKeyId() {
        if ("razorpay".equalsIgnoreCase(paymentConfig.getGateway()) && paymentConfig.getRazorpay() != null) {
            return paymentConfig.getRazorpay().getKeyId();
        }
        return "mock_key_id";
    }

    // ── Mappers ─────────────────────────────────────────────────────────────

    private PlanResponse mapToPlanResponse(SubscriptionPlan plan) {
        List<String> features = Collections.emptyList();
        if (StringUtils.hasText(plan.getFeaturesJson())) {
            try {
                features = objectMapper.readValue(plan.getFeaturesJson(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                log.error("Failed to parse features JSON for plan {}", plan.getPlanCode(), e);
            }
        }
        
        return PlanResponse.builder()
                .planCode(plan.getPlanCode())
                .name(plan.getName())
                .description(plan.getDescription())
                .targetRole(plan.getTargetRole())
                .priceAmount(plan.getPriceAmount())
                .currency(plan.getCurrency())
                .billingCycle(plan.getBillingCycle())
                .features(features)
                .maxJobs(plan.getMaxJobs())
                .maxAiMatches(plan.getMaxAiMatches())
                .active(plan.isActive())
                .build();
    }
    
    private SubscriptionResponse mapToSubscriptionResponse(Subscription sub) {
        return SubscriptionResponse.builder()
                .subscriptionId(sub.getId())
                .status(sub.getStatus())
                .plan(mapToPlanResponse(sub.getPlan()))
                .currentPeriodStart(sub.getCurrentPeriodStart())
                .currentPeriodEnd(sub.getCurrentPeriodEnd())
                .autoRenew(sub.isAutoRenew())
                .cancelledAt(sub.getCancelledAt())
                .build();
    }
    
    private TransactionResponse mapToTransactionResponse(PaymentTransaction tx) {
        return TransactionResponse.builder()
                .orderId(tx.getOrderId())
                .gatewayPaymentId(tx.getGatewayPaymentId())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .status(tx.getStatus().name())
                .planName(tx.getPlan().getName())
                .paymentMethod(tx.getPaymentMethod())
                .maskedDetails(tx.getMaskedDetails())
                .createdAt(tx.getCreatedAt())
                .errorMessage(tx.getErrorMessage())
                .build();
    }
}
