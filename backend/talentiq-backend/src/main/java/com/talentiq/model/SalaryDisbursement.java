package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.DisbursementType;
import com.talentiq.common.enums.SalaryStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "salary_disbursements",
        indexes = {
                @Index(name = "idx_sd_company_status", columnList = "company_id, status"),
                @Index(name = "idx_sd_employee", columnList = "employee_id"),
                @Index(name = "idx_sd_period", columnList = "company_id, period_label")
        }
)
@Builder
public class SalaryDisbursement extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "period_label", nullable = false, length = 50)
    private String periodLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "disbursement_type", nullable = false, length = 30)
    @Builder.Default
    private DisbursementType disbursementType = DisbursementType.MONTHLY_SALARY;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SalaryStatus status = SalaryStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by")
    private User submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "payment_provider", length = 30)
    private String paymentProvider;

    @Column(name = "transaction_ref", length = 200)
    private String transactionRef;

    @Column(name = "payment_status", length = 30)
    private String paymentStatus;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "payment_error", columnDefinition = "TEXT")
    private String paymentError;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
