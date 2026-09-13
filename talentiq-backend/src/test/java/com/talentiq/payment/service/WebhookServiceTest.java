package com.talentiq.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.Role;
import com.talentiq.model.User;
import com.talentiq.payment.config.PaymentConfig;
import com.talentiq.payment.enums.BillingCycle;
import com.talentiq.payment.enums.PaymentTransactionStatus;
import com.talentiq.payment.enums.SubscriptionStatus;
import com.talentiq.payment.model.PaymentTransaction;
import com.talentiq.payment.model.Subscription;
import com.talentiq.payment.model.SubscriptionPlan;
import com.talentiq.payment.model.WebhookEvent;
import com.talentiq.payment.repository.PaymentTransactionRepository;
import com.talentiq.payment.repository.SubscriptionRepository;
import com.talentiq.payment.repository.WebhookEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WebhookService Unit Tests")
class WebhookServiceTest {

    @Mock private PaymentConfig paymentConfig;
    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private PaymentTransactionRepository transactionRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private WebhookService webhookService;

    private User candidateUser;
    private SubscriptionPlan proPlan;
    private PaymentTransaction transaction;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder()
                .id(5L)
                .email("test.sub@talentiq.ai")
                .roles(java.util.Set.of(Role.ROLE_CANDIDATE))
                .build();

        proPlan = SubscriptionPlan.builder()
                .id(10L)
                .planCode("CANDIDATE_PRO")
                .name("Candidate Pro")
                .priceAmount(new BigDecimal("99.00"))
                .currency("INR")
                .billingCycle(BillingCycle.MONTHLY)
                .build();

        transaction = PaymentTransaction.builder()
                .id(101L)
                .orderId("ord_webhook_123")
                .gatewayOrderId("order_rzp_webhook_999")
                .user(candidateUser)
                .plan(proPlan)
                .amount(new BigDecimal("99.00"))
                .currency("INR")
                .status(PaymentTransactionStatus.CREATED)
                .build();
    }

    @Test
    @DisplayName("handleRazorpayWebhook processes payment.captured, sets PAID status, extracts masked card, and activates subscription")
    void testHandleWebhook_PaymentCaptured() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(startsWith("lock:sub:webhook:"), eq("LOCKED"), any(Duration.class))).thenReturn(true);
        when(webhookEventRepository.existsByEventId("evt_test_123")).thenReturn(false);
        when(transactionRepository.findByGatewayOrderId("order_rzp_webhook_999")).thenReturn(Optional.of(transaction));

        Subscription newSub = Subscription.builder()
                .id(202L)
                .user(candidateUser)
                .plan(proPlan)
                .status(SubscriptionStatus.ACTIVE)
                .build();
        when(subscriptionRepository.save(any(Subscription.class))).thenReturn(newSub);

        String payload = """
        {
          "event_id": "evt_test_123",
          "event": "payment.captured",
          "payload": {
            "payment": {
              "entity": {
                "id": "pay_test_888",
                "order_id": "order_rzp_webhook_999",
                "amount": 9900,
                "currency": "INR",
                "method": "card",
                "card": {
                  "last4": "4242",
                  "network": "Visa"
                }
              }
            },
            "order": {
              "entity": {
                "id": "order_rzp_webhook_999"
              }
            }
          }
        }
        """;

        webhookService.handleRazorpayWebhook(payload, null);

        assertThat(transaction.getStatus()).isEqualTo(PaymentTransactionStatus.PAID);
        assertThat(transaction.getGatewayPaymentId()).isEqualTo("pay_test_888");
        assertThat(transaction.getPaymentMethod()).isEqualTo("CARD");
        assertThat(transaction.getMaskedDetails()).isEqualTo("Visa •••• 4242");

        verify(subscriptionRepository).save(any(Subscription.class));
        verify(transactionRepository).save(transaction);
        verify(webhookEventRepository).save(any(WebhookEvent.class));
        verify(redisTemplate).delete("lock:sub:webhook:evt_test_123");
    }

    @Test
    @DisplayName("handleRazorpayWebhook ignores duplicate eventId idempotently")
    void testHandleWebhook_DuplicateSkipped() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(startsWith("lock:sub:webhook:"), eq("LOCKED"), any(Duration.class))).thenReturn(true);
        when(webhookEventRepository.existsByEventId("evt_duplicate_001")).thenReturn(true);

        String payload = """
        {
          "event_id": "evt_duplicate_001",
          "event": "payment.captured"
        }
        """;

        webhookService.handleRazorpayWebhook(payload, null);

        verify(transactionRepository, never()).findByGatewayOrderId(anyString());
        verify(subscriptionRepository, never()).save(any(Subscription.class));
        verify(redisTemplate).delete("lock:sub:webhook:evt_duplicate_001");
    }
}
