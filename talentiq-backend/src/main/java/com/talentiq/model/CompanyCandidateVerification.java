package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Represents a Company Verified Tag/Credential awarded to a candidate.
 * Initiated by an authorized HR recruiter, approved strictly by the corresponding Company Owner/Director/CEO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "company_candidate_verifications",
        indexes = {
                @Index(name = "idx_comp_verif_company_status", columnList = "company_id, status"),
                @Index(name = "idx_comp_verif_candidate", columnList = "candidate_user_id, status"),
                @Index(name = "idx_comp_verif_hr", columnList = "hr_user_id"),
                @Index(name = "idx_comp_verif_cert_id", columnList = "badge_certificate_id", unique = true)
        }
)
@Builder
public class CompanyCandidateVerification extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_user_id")
    private User hrUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_profile_id")
    private HrProfile hrProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_user_id", nullable = false)
    private User candidateUser;

    @Column(name = "job_title", nullable = false, length = 150)
    private String jobTitle;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, REVOKED

    @Column(name = "requested_at", nullable = false)
    @Builder.Default
    private Instant requestedAt = Instant.now();

    @Column(name = "approved_at")
    private Instant approvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_user_id")
    private User approvedByUser;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "badge_certificate_id", unique = true, length = 64)
    private String badgeCertificateId;

    @Column(name = "skills_tagged", length = 500)
    private String skillsTagged;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
