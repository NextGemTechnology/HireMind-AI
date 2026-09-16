package com.talentiq.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.model.User;
import com.talentiq.payment.config.PaymentConfig;
import com.talentiq.payment.dto.SubscriptionDto.*;
import com.talentiq.payment.enums.BillingCycle;
import com.talentiq.payment.enums.GatewayProvider;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SubscriptionServiceTest {

    @Mock
    private SubscriptionPlanRepository planRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private PaymentTransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentGatewayService paymentGatewayService;

    @Mock
    private PaymentConfig paymentConfig;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private ObjectMapper objectMapper = new ObjectMapper();

    private SubscriptionServiceImpl subscriptionService;

    private User candidateUser;
    private SubscriptionPlan candidatePlan;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        subscriptionService = new SubscriptionServiceImpl(
                planRepository,
                subscriptionRepository,
                transactionRepository,
                userRepository,
                paymentGatewayService,
                paymentConfig,
                redisTemplate,
                objectMapper
        );

        candidateUser = User.builder()
                .id(100L)
                .email("test.candidate@gmail.com")
                .firstName("Test")
                .lastName("Candidate")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .build();

        candidatePlan = SubscriptionPlan.builder()
                .id(1L)
                .planCode("CANDIDATE_PRO")
                .name("Candidate Pro")
                .targetRole(TargetRole.CANDIDATE)
                .priceAmount(BigDecimal.valueOf(99.00))
                .currency("INR")
                .billingCycle(BillingCycle.MONTHLY)
                .active(true)
                .build();
    }

    @Test
    void shouldReturnPlansFilteredByRole() {
        when(planRepository.findByTargetRoleAndActiveTrueOrderByDisplayOrderAsc(TargetRole.CANDIDATE))
                .thenReturn(List.of(candidatePlan));

        List<PlanResponse> plans = subscriptionService.getPlans(TargetRole.CANDIDATE);

        assertEquals(1, plans.size());
        assertEquals("CANDIDATE_PRO", plans.get(0).getPlanCode());
        assertEquals("Candidate Pro", plans.get(0).getName());
    }

    @Test
    void shouldInitiatePurchaseSuccessfully() {
        InitiatePurchaseRequest request = new InitiatePurchaseRequest();
        request.setPlanCode("CANDIDATE_PRO");
        request.setBillingCycle(BillingCycle.MONTHLY);
        request.setIdempotencyKey("idem-key-123");

        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        when(transactionRepository.findByIdempotencyKey("idem-key-123")).thenReturn(Optional.empty());
        when(userRepository.findById(100L)).thenReturn(Optional.of(candidateUser));
        when(planRepository.findByPlanCode("CANDIDATE_PRO")).thenReturn(Optional.of(candidatePlan));
        when(paymentGatewayService.getProviderName()).thenReturn("MOCK");
        when(subscriptionRepository.findByUserIdAndStatusWithPlan(100L, SubscriptionStatus.ACTIVE)).thenReturn(Optional.empty());
        when(paymentGatewayService.createOrder(any(PaymentTransaction.class))).thenReturn(
                CreateOrderResponse.builder()
                        .orderId("order_mock_123")
                        .gatewayOrderId("gw_order_123")
                        .amount(BigDecimal.valueOf(99.00))
                        .currency("INR")
                        .gatewayKeyId("key_123")
                        .build()
        );

        CreateOrderResponse response = subscriptionService.initiatePurchase(100L, request);

        assertNotNull(response);
        assertEquals("order_mock_123", response.getOrderId());
        verify(transactionRepository, times(2)).save(any(PaymentTransaction.class));
    }

    @Test
    void shouldRejectPurchaseWhenRoleDoesNotMatchPlan() {
        InitiatePurchaseRequest request = new InitiatePurchaseRequest();
        request.setPlanCode("CANDIDATE_PRO");
        request.setBillingCycle(BillingCycle.MONTHLY);
        request.setIdempotencyKey("idem-key-456");

        User hrUser = User.builder()
                .id(200L)
                .email("hr@company.com")
                .roles(Set.of(Role.ROLE_HR))
                .build();

        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        when(transactionRepository.findByIdempotencyKey("idem-key-456")).thenReturn(Optional.empty());
        when(userRepository.findById(200L)).thenReturn(Optional.of(hrUser));
        when(planRepository.findByPlanCode("CANDIDATE_PRO")).thenReturn(Optional.of(candidatePlan));

        assertThrows(ForbiddenException.class, () -> subscriptionService.initiatePurchase(200L, request));
    }

    @Test
    void shouldPreventDuplicateActiveSubscriptionToSamePlan() {
        InitiatePurchaseRequest request = new InitiatePurchaseRequest();
        request.setPlanCode("CANDIDATE_PRO");
        request.setBillingCycle(BillingCycle.MONTHLY);
        request.setIdempotencyKey("idem-key-789");

        Subscription existingSub = Subscription.builder()
                .id(10L)
                .user(candidateUser)
                .plan(candidatePlan)
                .status(SubscriptionStatus.ACTIVE)
                .build();

        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        when(transactionRepository.findByIdempotencyKey("idem-key-789")).thenReturn(Optional.empty());
        when(userRepository.findById(100L)).thenReturn(Optional.of(candidateUser));
        when(planRepository.findByPlanCode("CANDIDATE_PRO")).thenReturn(Optional.of(candidatePlan));
        when(subscriptionRepository.findByUserIdAndStatusWithPlan(100L, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(existingSub));

        assertThrows(ConflictException.class, () -> subscriptionService.initiatePurchase(100L, request));
    }

    @Test
    void shouldCancelActiveSubscriptionSuccessfully() {
        Subscription existingSub = Subscription.builder()
                .id(10L)
                .user(candidateUser)
                .plan(candidatePlan)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plus(Duration.ofDays(15)))
                .build();

        CancelRequest cancelReq = new CancelRequest();
        cancelReq.setReason("No longer searching for jobs");

        when(subscriptionRepository.findByUserIdAndStatusWithPlan(100L, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(existingSub));

        subscriptionService.cancelSubscription(100L, cancelReq);

        assertEquals(SubscriptionStatus.CANCELLED, existingSub.getStatus());
        assertEquals("No longer searching for jobs", existingSub.getCancelReason());
        assertNotNull(existingSub.getCancelledAt());
        verify(subscriptionRepository, times(1)).save(existingSub);
    }
}
