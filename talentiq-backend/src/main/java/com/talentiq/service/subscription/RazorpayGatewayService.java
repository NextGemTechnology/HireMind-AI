package com.talentiq.service.subscription;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.talentiq.common.exception.BusinessException;
import com.talentiq.config.PaymentConfig;
import com.talentiq.dto.subscription.SubscriptionDto.CreateOrderResponse;
import com.talentiq.model.PaymentTransaction;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.payment.gateway", havingValue = "razorpay")
public class RazorpayGatewayService implements PaymentGatewayService {

    private final PaymentConfig paymentConfig;
    private final RazorpayClient razorpayClient;

    public RazorpayGatewayService(PaymentConfig paymentConfig) {
        this.paymentConfig = paymentConfig;
        try {
            this.razorpayClient = new RazorpayClient(
                    paymentConfig.getRazorpay().getKeyId(),
                    paymentConfig.getRazorpay().getKeySecret()
            );
            log.info("Razorpay client initialized successfully.");
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay client", e);
            throw new RuntimeException("Payment gateway initialization failed", e);
        }
    }

    @Override
    public CreateOrderResponse createOrder(PaymentTransaction transaction) {
        try {
            // Razorpay expects amount in the smallest currency sub-unit (paise for INR)
            int amountInPaise = transaction.getAmount().multiply(new BigDecimal("100")).intValueExact();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", transaction.getCurrency());
            orderRequest.put("receipt", transaction.getOrderId());
            
            JSONObject notes = new JSONObject();
            notes.put("userId", transaction.getUser().getId().toString());
            notes.put("planCode", transaction.getPlan().getPlanCode());
            orderRequest.put("notes", notes);

            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String gatewayOrderId = razorpayOrder.get("id");

            log.info("Created Razorpay order: {} for internal order: {}", gatewayOrderId, transaction.getOrderId());

            return CreateOrderResponse.builder()
                    .orderId(transaction.getOrderId())
                    .gatewayOrderId(gatewayOrderId)
                    .amount(transaction.getAmount())
                    .currency(transaction.getCurrency())
                    .gatewayKeyId(paymentConfig.getRazorpay().getKeyId())
                    .build();

        } catch (RazorpayException e) {
            log.error("Error creating Razorpay order for tx {}", transaction.getOrderId(), e);
            throw new BusinessException("PAYMENT_GATEWAY_ERROR", "Failed to communicate with payment gateway: " + e.getMessage());
        }
    }

    @Override
    public boolean verifyPaymentSignature(String gatewayOrderId, String gatewayPaymentId, String signature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", gatewayOrderId);
            options.put("razorpay_payment_id", gatewayPaymentId);
            options.put("razorpay_signature", signature);

            return Utils.verifyPaymentSignature(options, paymentConfig.getRazorpay().getKeySecret());
        } catch (RazorpayException e) {
            log.error("Error verifying Razorpay signature for order {}", gatewayOrderId, e);
            return false;
        }
    }

    @Override
    public PaymentDetails fetchPaymentDetails(String gatewayPaymentId) {
        try {
            com.razorpay.Payment payment = razorpayClient.payments.fetch(gatewayPaymentId);
            
            // Amount in Razorpay is returned in paise (integer)
            Integer amountPaise = payment.get("amount");
            BigDecimal amount = amountPaise != null 
                    ? new BigDecimal(amountPaise).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            String currency = payment.has("currency") ? (String) payment.get("currency") : "INR";
            String status = payment.has("status") ? (String) payment.get("status") : "unknown";
            String orderId = payment.has("order_id") ? (String) payment.get("order_id") : null;
            String method = payment.has("method") ? (String) payment.get("method") : null;
            
            String maskedDetails = extractMaskedDetails(payment, method);
            
            String errorCode = payment.has("error_code") && payment.get("error_code") != null 
                    ? payment.get("error_code").toString() : null;
            String errorDescription = payment.has("error_description") && payment.get("error_description") != null 
                    ? payment.get("error_description").toString() : null;

            log.info("Fetched Razorpay payment {}: status={}, method={}, amount={} {}", 
                    gatewayPaymentId, status, method, amount, currency);

            return PaymentDetails.builder()
                    .paymentId(gatewayPaymentId)
                    .orderId(orderId)
                    .status(status)
                    .amount(amount)
                    .currency(currency)
                    .paymentMethod(method != null ? method.toUpperCase() : "UNKNOWN")
                    .maskedDetails(maskedDetails)
                    .errorCode(errorCode)
                    .errorDescription(errorDescription)
                    .build();

        } catch (RazorpayException e) {
            log.error("Error fetching Razorpay payment details for id {}", gatewayPaymentId, e);
            throw new BusinessException("PAYMENT_GATEWAY_ERROR", "Failed to fetch payment details from Razorpay: " + e.getMessage());
        }
    }

    private String extractMaskedDetails(com.razorpay.Payment payment, String method) {
        if (method == null) {
            return null;
        }
        try {
            switch (method.toLowerCase()) {
                case "card":
                    if (payment.has("card") && payment.get("card") != null) {
                        JSONObject cardObj = payment.toJson().optJSONObject("card");
                        if (cardObj != null) {
                            String last4 = cardObj.optString("last4", "");
                            String network = cardObj.optString("network", "");
                            return (network + " •••• " + last4).trim();
                        }
                    }
                    break;
                case "upi":
                    if (payment.has("vpa") && payment.get("vpa") != null) {
                        return payment.get("vpa").toString();
                    }
                    break;
                case "netbanking":
                    if (payment.has("bank") && payment.get("bank") != null) {
                        return "NetBanking (" + payment.get("bank").toString() + ")";
                    }
                    break;
                case "wallet":
                    if (payment.has("wallet") && payment.get("wallet") != null) {
                        return "Wallet (" + payment.get("wallet").toString() + ")";
                    }
                    break;
                default:
                    break;
            }
        } catch (Exception ex) {
            log.warn("Failed to extract masked details from payment payload", ex);
        }
        return method.toUpperCase();
    }

    @Override
    public String getProviderName() {
        return "RAZORPAY";
    }
}
