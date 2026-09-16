package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
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
        name = "employee_performance_reviews",
        indexes = {
                @Index(name = "idx_perf_company", columnList = "company_id"),
                @Index(name = "idx_perf_employee", columnList = "employee_id"),
                @Index(name = "idx_perf_period", columnList = "company_id, review_period"),
                @Index(name = "idx_perf_rating", columnList = "company_id, rating_category")
        }
)
@Builder
public class EmployeePerformanceReview extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_user_id", nullable = false)
    private User reviewerUser;

    @Column(name = "review_period", nullable = false, length = 50)
    @Builder.Default
    private String reviewPeriod = "Q3 2026";

    @Column(nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal rating = new BigDecimal("4.50");

    @Column(name = "rating_category", nullable = false, length = 30)
    @Builder.Default
    private String ratingCategory = "EXCELLENT"; // EXCELLENT, GOOD, AVERAGE, NEEDS_IMPROVEMENT

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "goals_okrs", columnDefinition = "TEXT")
    private String goalsOkrs;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    @PrePersist
    protected void onReviewCreate() {
        if (this.reviewedAt == null) {
            this.reviewedAt = Instant.now();
        }
    }
}
