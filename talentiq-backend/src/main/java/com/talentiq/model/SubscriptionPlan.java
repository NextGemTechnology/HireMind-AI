package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.BillingCycle;
import com.talentiq.common.enums.TargetRole;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Subscription plan catalog entry.
 * Defines pricing, features, and target audience for each plan tier.
 */
@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "subscription_plans",
        indexes = {
                @Index(name = "idx_sp_target_role", columnList = "target_role"),
                @Index(name = "idx_sp_is_active",   columnList = "is_active")
        }
)
public class SubscriptionPlan extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique machine-readable code (e.g. CANDIDATE_PRO, HR_ENTERPRISE). */
    @Column(name = "plan_code", nullable = false, unique = true, length = 50)
    private String planCode;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Which user role this plan is available to. */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", nullable = false, length = 30)
    private TargetRole targetRole;

    @Column(name = "price_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceAmount;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 20)
    @Builder.Default
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    /** JSON array of human-readable feature strings. */
    @Column(name = "features_json", columnDefinition = "TEXT")
    private String featuresJson;

    /** Max concurrent job postings (null = unlimited). */
    @Column(name = "max_jobs")
    private Integer maxJobs;

    /** Max AI match queries per month (null = unlimited). */
    @Column(name = "max_ai_matches")
    private Integer maxAiMatches;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /** Ordering for display on the pricing page (ascending). */
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;
}
