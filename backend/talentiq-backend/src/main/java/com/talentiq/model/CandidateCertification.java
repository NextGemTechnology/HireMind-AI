package com.talentiq.model;
import lombok.*;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "candidate_certifications",
        indexes = {
                @Index(name = "idx_candidate_certifications_candidate_id", columnList = "candidate_id")
        }
)
@Builder
public class CandidateCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 150)
    private String issuer;

    @Column(name = "credential_id", length = 150)
    private String credentialId;

    @Column(name = "credential_url", length = 500)
    private String credentialUrl;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "does_not_expire", nullable = false)
    @Builder.Default
    private boolean doesNotExpire = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
