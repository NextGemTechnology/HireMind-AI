package com.talentiq.model;
import lombok.*;

import com.talentiq.model.User;
import jakarta.persistence.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "saved_jobs",
        uniqueConstraints = @UniqueConstraint(name = "uk_saved_jobs_user_job", columnNames = {"user_id", "job_id"}),
        indexes = {
                @Index(name = "idx_saved_jobs_user_id", columnList = "user_id"),
                @Index(name = "idx_saved_jobs_job_id", columnList = "job_id")
        }
)
@Builder
public class SavedJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
