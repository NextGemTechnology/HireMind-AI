package com.talentiq.service.subscription;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.*;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.BusinessException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.dto.subscription.SubscriptionDto.*;
import com.talentiq.model.*;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.repository.subscription.PaymentTransactionRepository;
import com.talentiq.repository.subscription.SubscriptionPlanRepository;
import com.talentiq.repository.subscription.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
        // Find active subscription
        Optional<Subscription> optSub = subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE);
        
        if (optSub.isEmpty()) {
            return null;
        }
        
        return mapToSubscriptionResponse(optSub.get());
    }

    @Override
    @Transactional
    public CreateOrderResponse initiatePurchase(Long userId, InitiatePurchaseRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
                
        SubscriptionPlan plan = planRepository.findByPlanCode(request.getPlanCode())
                .orElseThrow(() -> new ResourceNotFoundException("SubscriptionPlan", "planCode", request.getPlanCode()));

        if (!plan.isActive()) {
            throw new BadRequestException("This plan is no longer available for purchase");
        }
        
        // Prevent active subscribers from purchasing another plan without upgrading/canceling
        Optional<Subscription> activeSub = subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE);
        if (activeSub.isPresent() && activeSub.get().getPlan().getId().equals(plan.getId())) {
            throw new ConflictException("You already have an active subscription to this plan");
        }
        // TODO: Handle upgrades/downgrades gracefully instead of just blocking

        String idempotencyKey = StringUtils.hasText(request.getIdempotencyKey()) 
                ? request.getIdempotencyKey() 
                : UUID.randomUUID().toString();

        // Check idempotency
        Optional<PaymentTransaction> existingTx = transactionRepository.findByIdempotencyKey(idempotencyKey);
        if (existingTx.isPresent()) {
            PaymentTransaction tx = existingTx.get();
            if (tx.getStatus() == PaymentTransactionStatus.CREATED) {
                return CreateOrderResponse.builder()
                        .orderId(tx.getOrderId())
                        .gatewayOrderId(tx.getGatewayOrderId())
                        .amount(tx.getAmount())
                        .currency(tx.getCurrency())
                        // Note: gatewayKeyId is only available via gateway service config, but we'll return generic response
                        .gatewayKeyId(paymentGatewayService.getProviderName().equals("MOCK") ? "mock_key" : "razorpay_key_placeholder") 
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
        
        // 3. Update transaction with gateway ID
        transaction.setGatewayOrderId(response.getGatewayOrderId());
        transactionRepository.save(transaction);
        
        return response;
    }

    @Override
    @Transactional
    public SubscriptionResponse verifyAndActivate(Long userId, VerifyPaymentRequest request) {
        PaymentTransaction tx = transactionRepository.findByOrderId(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", "orderId", request.getOrderId()));
                
        if (!tx.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Order does not belong to the current user");
        }
        
        if (tx.getStatus() == PaymentTransactionStatus.CAPTURED) {
            // Already processed
            return getMySubscription(userId);
        }
        
        if (tx.getStatus() != PaymentTransactionStatus.CREATED && tx.getStatus() != PaymentTransactionStatus.AUTHORIZED) {
            throw new BadRequestException("Transaction is in an invalid state: " + tx.getStatus());
        }

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
        
        // 2. Mark Transaction as Captured
        tx.setStatus(PaymentTransactionStatus.CAPTURED);
        tx.setGatewayPaymentId(request.getGatewayPaymentId());
        tx.setGatewaySignature(request.getGatewaySignature());
        
        // 3. Cancel any existing active subscriptions (simplistic upgrade/replace flow)
        subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE)
            .ifPresent(existing -> {
                existing.setStatus(SubscriptionStatus.CANCELLED);
                existing.setCancelledAt(Instant.now());
                existing.setCancelReason("Replaced by new subscription " + tx.getOrderId());
                subscriptionRepository.save(existing);
            });
            
        // 4. Create/Activate Subscription
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
        
        return mapToSubscriptionResponse(subscription);
    }

    @Override
    @Transactional
    public void cancelSubscription(Long userId, CancelRequest request) {
        Subscription sub = subscriptionRepository.findByUserIdAndStatusWithPlan(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new BadRequestException("No active subscription found to cancel"));
                
        sub.setAutoRenew(false);
        sub.setStatus(SubscriptionStatus.CANCELLED);
        sub.setCancelledAt(Instant.now());
        sub.setCancelReason(request.getReason());
        
        subscriptionRepository.save(sub);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactionHistory(Long userId, Pageable pageable) {
        return transactionRepository.findByUserIdWithPlanOrderByCreatedAtDesc(userId, pageable)
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
            log.info("Expired subscription {} for user {}", sub.getId(), sub.getUser().getId());
        }
        
        if (!expired.isEmpty()) {
            subscriptionRepository.saveAll(expired);
        }
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
                .createdAt(tx.getCreatedAt())
                .errorMessage(tx.getErrorMessage())
                .build();
    }
}
