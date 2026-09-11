package com.talentiq.service.subscription;

import com.talentiq.dto.subscription.SubscriptionDto.CreateOrderResponse;
import com.talentiq.model.PaymentTransaction;

public interface PaymentGatewayService {
    
    /**
     * Creates an order with the payment gateway.
     */
    CreateOrderResponse createOrder(PaymentTransaction transaction);
    
    /**
     * Verifies the payment signature returned by the gateway.
     */
    boolean verifyPaymentSignature(String gatewayOrderId, String gatewayPaymentId, String signature);
    
    /**
     * Returns the name of the provider (e.g., RAZORPAY, MOCK).
     */
    String getProviderName();
}
