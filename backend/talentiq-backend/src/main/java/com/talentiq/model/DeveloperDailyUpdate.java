package com.talentiq.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "developer_daily_updates",
        indexes = {
                @Index(name = "idx_dev_update_user", columnList = "user_id"),
                @Index(name = "idx_dev_update_company", columnList = "company_id"),
                @Index(name = "idx_dev_update_submitted", columnList = "submitted_at")
        }
)
public class DeveloperDailyUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "work_summary", nullable = false, columnDefinition = "TEXT")
    private String workSummary;

    @Column(columnDefinition = "TEXT")
    private String blockers;

    @Column(name = "submitted_at", nullable = false)
    @Builder.Default
    private Instant submittedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (this.submittedAt == null) {
            this.submittedAt = Instant.now();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
