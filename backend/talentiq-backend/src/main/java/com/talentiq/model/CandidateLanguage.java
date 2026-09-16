package com.talentiq.model;
import lombok.*;

import jakarta.persistence.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "candidate_languages",
        uniqueConstraints = @UniqueConstraint(name = "uk_candidate_language", columnNames = {"candidate_id", "language"}),
        indexes = {
                @Index(name = "idx_candidate_languages_candidate_id", columnList = "candidate_id")
        }
)
@Builder
public class CandidateLanguage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(nullable = false, length = 100)
    private String language;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String proficiency = "CONVERSATIONAL";

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
