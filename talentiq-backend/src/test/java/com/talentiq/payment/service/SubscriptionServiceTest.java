package com.talentiq.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.BusinessException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.model.User;
import com.talentiq.payment.config.PaymentConfig;
import com.talentiq.payment.dto.SubscriptionDto.*;
import com.talentiq.payment.enums.BillingCycle;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SubscriptionService Unit Tests")
class SubscriptionServiceTest {

    @Mock private SubscriptionPlanRepository planRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private PaymentTransactionRepository transactionRepository;
    @Mock private UserRepository userRepository;
    @Mock private PaymentGatewayService paymentGatewayService;
    @Mock private PaymentConfig paymentConfig;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private SubscriptionServiceImpl subscriptionService;

    private User candidateUser;
    private SubscriptionPlan proPlan;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder()
                .id(1L)
                .email("candidate@talentiq.ai")
                .firstName("Alex")
                .lastName("Candidate")
                .roles(java.util.Set.of(Role.ROLE_CANDIDATE))
                .build();

        proPlan = SubscriptionPlan.builder()
                .id(10L)
                .planCode("CANDIDATE_PRO")
                .name("Candidate Pro")
                .targetRole(TargetRole.CANDIDATE)
                .priceAmount(new BigDecimal("99.00"))
                .currency("INR")
                .billingCycle(BillingCycle.MONTHLY)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("initiatePurchase successfully acquires lock and creates transaction and gateway order")
    void testInitiatePurchase_Success() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(startsWith("lock:sub:order:"), eq("LOCKED"), any(Duration.class))).thenReturn(true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));
        when(planRepository.findByPlanCode("CANDIDATE_PRO")).thenReturn(Optional.of(proPlan));
        when(subscriptionRepository.findByUserIdAndStatusWithPlan(1L, SubscriptionStatus.ACTIVE)).thenReturn(Optional.empty());
        when(transactionRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(paymentGatewayService.getProviderName()).thenReturn("MOCK");

        CreateOrderResponse mockOrderRes = CreateOrderResponse.builder()
                .orderId("ord_123")
                .gatewayOrderId("mock_order_123")
                .amount(new BigDecimal("99.00"))
                .currency("INR")
                .gatewayKeyId("mock_key_id")
                .build();
        when(paymentGatewayService.createOrder(any(PaymentTransaction.class))).thenReturn(mockOrderRes);

        InitiatePurchaseRequest req = InitiatePurchaseRequest.builder()
                .planCode("CANDIDATE_PRO")
                .billingCycle(BillingCycle.MONTHLY)
                .build();

        CreateOrderResponse result = subscriptionService.initiatePurchase(1L, req);

        assertThat(result).isNotNull();
        assertThat(result.getGatewayOrderId()).isEqualTo("mock_order_123");
        verify(transactionRepository, atLeastOnce()).save(any(PaymentTransaction.class));
        verify(redisTemplate).delete("lock:sub:order:1");
    }

    @Test
    @DisplayName("initiatePurchase throws ConflictException if user already has active subscription to same plan")
    void testInitiatePurchase_AlreadyActiveSubscription() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));
        when(planRepository.findByPlanCode("CANDIDATE_PRO")).thenReturn(Optional.of(proPlan));

        Subscription activeSub = Subscription.builder()
                .id(99L)
                .user(candidateUser)
                .plan(proPlan)
                .status(SubscriptionStatus.ACTIVE)
                .build();
        when(subscriptionRepository.findByUserIdAndStatusWithPlan(1L, SubscriptionStatus.ACTIVE)).thenReturn(Optional.of(activeSub));

        InitiatePurchaseRequest req = InitiatePurchaseRequest.builder()
                .planCode("CANDIDATE_PRO")
                .billingCycle(BillingCycle.MONTHLY)
                .build();

        assertThatThrownBy(() -> subscriptionService.initiatePurchase(1L, req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already have an active subscription");

        verify(redisTemplate).delete("lock:sub:order:1");
    }

    @Test
    @DisplayName("verifyAndActivate verifies signature, cross-checks amount, sets PAID status, and saves masked details")
    void testVerifyAndActivate_Success() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(startsWith("lock:sub:verify:"), eq("LOCKED"), any(Duration.class))).thenReturn(true);

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(50L)
                .orderId("ord_abc123")
                .gatewayOrderId("order_rzp_999")
                .user(candidateUser)
                .plan(proPlan)
                .amount(new BigDecimal("99.00"))
                .currency("INR")
                .status(PaymentTransactionStatus.CREATED)
                .build();
        when(transactionRepository.findByOrderId("ord_abc123")).thenReturn(Optional.of(tx));

        when(paymentGatewayService.verifyPaymentSignature("order_rzp_999", "pay_rzp_111", "sig_valid")).thenReturn(true);

        PaymentDetails paymentDetails = PaymentDetails.builder()
                .paymentId("pay_rzp_111")
                .orderId("order_rzp_999")
                .status("captured")
                .amount(new BigDecimal("99.00"))
                .currency("INR")
                .paymentMethod("UPI")
                .maskedDetails("candidate@okhdfcbank")
                .build();
        when(paymentGatewayService.fetchPaymentDetails("pay_rzp_111")).thenReturn(paymentDetails);

        Subscription savedSub = Subscription.builder()
                .id(777L)
                .user(candidateUser)
                .plan(proPlan)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now())
                .currentPeriodEnd(Instant.now().plusSeconds(86400 * 30))
                .autoRenew(true)
                .build();
        when(subscriptionRepository.save(any(Subscription.class))).thenReturn(savedSub);

        VerifyPaymentRequest req = VerifyPaymentRequest.builder()
                .orderId("ord_abc123")
                .gatewayPaymentId("pay_rzp_111")
                .gatewaySignature("sig_valid")
                .build();

        SubscriptionResponse resp = subscriptionService.verifyAndActivate(1L, req);

        assertThat(resp).isNotNull();
        assertThat(resp.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(tx.getStatus()).isEqualTo(PaymentTransactionStatus.PAID);
        assertThat(tx.getPaymentMethod()).isEqualTo("UPI");
        assertThat(tx.getMaskedDetails()).isEqualTo("candidate@okhdfcbank");
        verify(redisTemplate).delete("lock:sub:verify:ord_abc123");
    }

    @Test
    @DisplayName("verifyAndActivate throws BusinessException and marks transaction FAILED when signature is invalid")
    void testVerifyAndActivate_InvalidSignature() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(50L)
                .orderId("ord_abc123")
                .gatewayOrderId("order_rzp_999")
                .user(candidateUser)
                .plan(proPlan)
                .amount(new BigDecimal("99.00"))
                .currency("INR")
                .status(PaymentTransactionStatus.CREATED)
                .build();
        when(transactionRepository.findByOrderId("ord_abc123")).thenReturn(Optional.of(tx));
        when(paymentGatewayService.verifyPaymentSignature(anyString(), anyString(), anyString())).thenReturn(false);

        VerifyPaymentRequest req = VerifyPaymentRequest.builder()
                .orderId("ord_abc123")
                .gatewayPaymentId("pay_fake")
                .gatewaySignature("sig_fake")
                .build();

        assertThatThrownBy(() -> subscriptionService.verifyAndActivate(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid payment signature");

        assertThat(tx.getStatus()).isEqualTo(PaymentTransactionStatus.FAILED);
        verify(redisTemplate).delete("lock:sub:verify:ord_abc123");
    }

    @Test
    @DisplayName("createQrPaymentSession creates dynamic time-limited UPI URI and stores TTL in Redis")
    void testCreateQrPaymentSession_Success() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(60L)
                .orderId("ord_qr_123")
                .user(candidateUser)
                .plan(proPlan)
                .amount(new BigDecimal("99.00"))
                .currency("INR")
                .status(PaymentTransactionStatus.CREATED)
                .build();
        when(transactionRepository.findByOrderId("ord_qr_123")).thenReturn(Optional.of(tx));

        CreateQrSessionResponse res = subscriptionService.createQrPaymentSession(1L, "ord_qr_123");

        assertThat(res).isNotNull();
        assertThat(res.getOrderId()).isEqualTo("ord_qr_123");
        assertThat(res.getUpiUri()).contains("upi://pay?pa=hiremind@icici");
        assertThat(res.getUpiUri()).contains("am=99.00");
        assertThat(res.getTtlSeconds()).isEqualTo(300L);
        assertThat(tx.getStatus()).isEqualTo(PaymentTransactionStatus.PENDING);
        verify(valueOperations).set(eq("pay:qr:ord_qr_123"), anyString(), eq(Duration.ofSeconds(300)));
        verify(valueOperations).set(eq("pay:qr:flag:ord_qr_123"), eq("ACTIVE"), eq(Duration.ofSeconds(420)));
    }

    @Test
    @DisplayName("verifyAndActivate throws BusinessException if QR session has expired in Redis")
    void testVerifyAndActivate_ExpiredQrSession() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(70L)
                .orderId("ord_expired_qr")
                .user(candidateUser)
                .plan(proPlan)
                .amount(new BigDecimal("99.00"))
                .currency("INR")
                .status(PaymentTransactionStatus.PENDING)
                .build();
        when(transactionRepository.findByOrderId("ord_expired_qr")).thenReturn(Optional.of(tx));

        // Simulate expired QR key in Redis
        when(redisTemplate.hasKey("pay:qr:flag:ord_expired_qr")).thenReturn(true);
        when(redisTemplate.getExpire("pay:qr:ord_expired_qr")).thenReturn(-2L); // -2 indicates expired/key does not exist

        VerifyPaymentRequest req = VerifyPaymentRequest.builder()
                .orderId("ord_expired_qr")
                .gatewayPaymentId("pay_expired")
                .gatewaySignature("sig_expired")
                .build();

        assertThatThrownBy(() -> subscriptionService.verifyAndActivate(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Payment QR session has expired");

        assertThat(tx.getStatus()).isEqualTo(PaymentTransactionStatus.EXPIRED);
        verify(redisTemplate).delete("lock:sub:verify:ord_expired_qr");
    }

    @Test
    @DisplayName("initiatePurchase throws ForbiddenException if user role does not match plan targetRole")
    void testInitiatePurchase_RoleMismatch_ThrowsForbidden() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        SubscriptionPlan hrPlan = SubscriptionPlan.builder()
                .id(20L)
                .planCode("HR_PRO")
                .name("HR Pro")
                .targetRole(TargetRole.HR)
                .priceAmount(new BigDecimal("499.00"))
                .currency("INR")
                .billingCycle(BillingCycle.MONTHLY)
                .active(true)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));
        when(planRepository.findByPlanCode("HR_PRO")).thenReturn(Optional.of(hrPlan));

        InitiatePurchaseRequest req = InitiatePurchaseRequest.builder()
                .planCode("HR_PRO")
                .billingCycle(BillingCycle.MONTHLY)
                .build();

        assertThatThrownBy(() -> subscriptionService.initiatePurchase(1L, req))
                .isInstanceOf(com.talentiq.common.exception.ForbiddenException.class)
                .hasMessageContaining("does not permit purchasing a HR plan");

        verify(redisTemplate).delete("lock:sub:order:1");
    }
}
