package com.talentiq.model;
import lombok.*;

import com.talentiq.model.Company;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "hr_analytics_snapshots",
        uniqueConstraints = @UniqueConstraint(name = "uk_hr_analytics_snapshots_company_date", columnNames = {"company_id", "snapshot_date"}),
        indexes = {
                @Index(name = "idx_hr_analytics_snapshots_company_id", columnList = "company_id"),
                @Index(name = "idx_hr_analytics_snapshots_date", columnList = "snapshot_date")
        }
)
@Builder
public class HrAnalyticsSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "active_jobs_count", nullable = false)
    @Builder.Default
    private Integer activeJobsCount = 0;

    @Column(name = "total_applications_count", nullable = false)
    @Builder.Default
    private Integer totalApplicationsCount = 0;

    @Column(name = "hires_count", nullable = false)
    @Builder.Default
    private Integer hiresCount = 0;

    @Column(name = "avg_time_to_hire_days", precision = 5, scale = 2)
    private BigDecimal avgTimeToHireDays;

    @Column(name = "conversion_rate", precision = 5, scale = 2)
    private BigDecimal conversionRate;

    @Column(name = "top_skills_in_demand", columnDefinition = "JSON")
    private String topSkillsInDemand; // JSON list of top requested skills

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
