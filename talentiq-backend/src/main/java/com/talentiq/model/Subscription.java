package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Active subscription record linking a user (and optionally a company) to a plan.
 * Each user may have at most one ACTIVE subscription at a time
 * (enforced via application logic, not DB constraint, to allow historical records).
 */
@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "subscriptions",
        indexes = {
                @Index(name = "idx_sub_user_id",     columnList = "user_id"),
                @Index(name = "idx_sub_company_id",  columnList = "company_id"),
                @Index(name = "idx_sub_status",      columnList = "status"),
                @Index(name = "idx_sub_period_end",  columnList = "current_period_end"),
                @Index(name = "idx_sub_user_status", columnList = "user_id, status")
        }
)
public class Subscription extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The subscriber (candidate or HR user). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The company this subscription is associated with (HR/Company Admin context). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** The plan this subscription is tied to. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(name = "current_period_start", nullable = false)
    private Instant currentPeriodStart;

    @Column(name = "current_period_end", nullable = false)
    private Instant currentPeriodEnd;

    @Column(name = "auto_renew", nullable = false)
    @Builder.Default
    private boolean autoRenew = true;

    /** Gateway-side subscription ID (Razorpay subscription_id if using recurring billing). */
    @Column(name = "gateway_subscription_id", length = 255)
    private String gatewaySubscriptionId;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;
}
