package com.talentiq.payment.service;

import com.talentiq.payment.dto.SubscriptionDto.*;
import com.talentiq.payment.enums.PaymentTransactionStatus;
import com.talentiq.payment.enums.TargetRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SubscriptionService {
    
    // Plans
    List<PlanResponse> getPlans(TargetRole targetRole);
    PlanResponse getPlanByCode(String planCode);
    
    // Core Subscription Lifecycle
    SubscriptionResponse getMySubscription(Long userId);
    
    CreateOrderResponse initiatePurchase(Long userId, InitiatePurchaseRequest request);
    
    CreateQrSessionResponse createQrPaymentSession(Long userId, String orderId);

    PaymentSessionStatusResponse getPaymentSessionStatus(Long userId, String orderId);

    SubscriptionResponse verifyAndActivate(Long userId, VerifyPaymentRequest request);
    
    void cancelSubscription(Long userId, CancelRequest request);
    
    // History
    Page<TransactionResponse> getTransactionHistory(Long userId, PaymentTransactionStatus status, String search, Pageable pageable);
    
    // Admin/System
    boolean hasActiveSubscription(Long userId, String planCode);
    void expireOverdueSubscriptions();
}
