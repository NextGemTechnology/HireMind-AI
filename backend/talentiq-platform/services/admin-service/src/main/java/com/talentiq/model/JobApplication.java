package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.ApplicationStatus;
import com.talentiq.model.Candidate;
import com.talentiq.model.Job;
import com.talentiq.model.Resume;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "job_applications",
        uniqueConstraints = @UniqueConstraint(name = "uk_job_applications_job_candidate", columnNames = {"job_id", "candidate_id"}),
        indexes = {
                @Index(name = "idx_job_applications_job_id", columnList = "job_id"),
                @Index(name = "idx_job_applications_candidate_id", columnList = "candidate_id"),
                @Index(name = "idx_job_applications_status", columnList = "status"),
                @Index(name = "idx_job_applications_applied_at", columnList = "applied_at")
        }
)
@Builder
public class JobApplication extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id")
    private Resume resume;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.APPLIED;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Column(name = "ai_match_score", precision = 5, scale = 2)
    private BigDecimal aiMatchScore;

    @Column(name = "ai_match_details", columnDefinition = "JSON")
    private String aiMatchDetails;

    @Column(name = "recruiter_notes", columnDefinition = "TEXT")
    private String recruiterNotes;

    @Column(name = "interview_date")
    private Instant interviewDate;

    @Column(name = "offer_date")
    private LocalDate offerDate;

    @Column(name = "offer_amount", precision = 12, scale = 2)
    private BigDecimal offerAmount;

    @Column(name = "offer_currency", length = 10)
    @Builder.Default
    private String offerCurrency = "USD";

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "applied_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant appliedAt = Instant.now();
}
