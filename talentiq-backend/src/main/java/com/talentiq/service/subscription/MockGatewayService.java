package com.talentiq.service.subscription;

import com.talentiq.dto.subscription.SubscriptionDto.CreateOrderResponse;
import com.talentiq.model.PaymentTransaction;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.payment.gateway", havingValue = "mock", matchIfMissing = true)
public class MockGatewayService implements PaymentGatewayService {

    public MockGatewayService() {
        log.warn("=========================================================");
        log.warn(" USING MOCK PAYMENT GATEWAY - DO NOT USE IN PRODUCTION");
        log.warn("=========================================================");
    }

    @Override
    public CreateOrderResponse createOrder(PaymentTransaction transaction) {
        String gatewayOrderId = "mock_order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        
        log.info("Created MOCK order: {} for internal order: {}", gatewayOrderId, transaction.getOrderId());
        
        return CreateOrderResponse.builder()
                .orderId(transaction.getOrderId())
                .gatewayOrderId(gatewayOrderId)
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .gatewayKeyId("mock_key_id")
                .build();
    }

    @Override
    public boolean verifyPaymentSignature(String gatewayOrderId, String gatewayPaymentId, String signature) {
        log.info("Verifying MOCK payment signature for order {} with payment {}", gatewayOrderId, gatewayPaymentId);
        // In mock mode, any signature starting with "mock_sig_" is considered valid
        return signature != null && signature.startsWith("mock_sig_");
    }

    @Override
    public String getProviderName() {
        return "MOCK";
    }
}
