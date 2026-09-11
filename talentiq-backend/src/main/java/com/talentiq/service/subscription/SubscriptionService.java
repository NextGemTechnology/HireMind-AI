package com.talentiq.service.subscription;

import com.talentiq.common.enums.TargetRole;
import com.talentiq.dto.subscription.SubscriptionDto.*;
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
    
    SubscriptionResponse verifyAndActivate(Long userId, VerifyPaymentRequest request);
    
    void cancelSubscription(Long userId, CancelRequest request);
    
    // History
    Page<TransactionResponse> getTransactionHistory(Long userId, Pageable pageable);
    
    // Admin/System
    boolean hasActiveSubscription(Long userId, String planCode);
    void expireOverdueSubscriptions();
}
