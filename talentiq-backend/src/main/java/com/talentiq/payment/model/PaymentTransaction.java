package com.talentiq.payment.model;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.model.User;
import com.talentiq.payment.enums.GatewayProvider;
import com.talentiq.payment.enums.PaymentTransactionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Full audit trail for every payment attempt (success or failure).
 * Used for transaction history, support, and reconciliation.
 */
@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "payment_transactions",
        indexes = {
                @Index(name = "idx_pt_user_id",          columnList = "user_id"),
                @Index(name = "idx_pt_subscription_id",  columnList = "subscription_id"),
                @Index(name = "idx_pt_status",           columnList = "status"),
                @Index(name = "idx_pt_gateway_order_id", columnList = "gateway_order_id")
        }
)
public class PaymentTransaction extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Internal order ID (UUID-based, our reference). */
    @Column(name = "order_id", nullable = false, unique = true, length = 100)
    private String orderId;

    /** Gateway's order ID (e.g. Razorpay order_id). Set after gateway order creation. */
    @Column(name = "gateway_order_id", length = 255)
    private String gatewayOrderId;

    /** Gateway's payment ID (e.g. Razorpay payment_id). Set after payment capture. */
    @Column(name = "gateway_payment_id", length = 255)
    private String gatewayPaymentId;

    /** The user who initiated this payment. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The subscription this payment activates (null until verified). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    /** The plan being purchased. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PaymentTransactionStatus status = PaymentTransactionStatus.CREATED;

    /** E.g. CARD, UPI, NETBANKING, WALLET */
    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    /** Safe masked details, e.g. "•••• 4242 (Visa)" or "user@okhdfcbank" - NEVER raw CVV/PIN/Card */
    @Column(name = "masked_details", length = 255)
    private String maskedDetails;

    @Enumerated(EnumType.STRING)
    @Column(name = "gateway_provider", nullable = false, length = 30)
    @Builder.Default
    private GatewayProvider gatewayProvider = GatewayProvider.MOCK;

    /** HMAC signature returned by the gateway post-payment. */
    @Column(name = "gateway_signature", length = 500)
    private String gatewaySignature;

    /**
     * Client-supplied idempotency key to prevent duplicate payments.
     * Must be unique per purchase attempt.
     */
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 255)
    private String idempotencyKey;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /** Additional metadata from gateway as raw JSON. */
    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;
}
