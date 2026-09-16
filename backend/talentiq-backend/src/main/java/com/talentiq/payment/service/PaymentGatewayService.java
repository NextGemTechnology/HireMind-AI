package com.talentiq.payment.service;

import com.talentiq.payment.dto.SubscriptionDto.CreateOrderResponse;
import com.talentiq.payment.model.PaymentTransaction;

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
     * Fetches detailed information for a captured/authorized payment from the gateway.
     */
    PaymentDetails fetchPaymentDetails(String gatewayPaymentId);
    
    /**
     * Returns the name of the provider (e.g., RAZORPAY, MOCK).
     */
    String getProviderName();
}
