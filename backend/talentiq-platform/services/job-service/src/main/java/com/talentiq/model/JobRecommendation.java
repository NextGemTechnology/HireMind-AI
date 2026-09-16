package com.talentiq.model;
import lombok.*;

import com.talentiq.model.Candidate;
import com.talentiq.model.Job;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "job_recommendations",
        uniqueConstraints = @UniqueConstraint(name = "uk_job_recommendations_candidate_job", columnNames = {"candidate_id", "job_id"}),
        indexes = {
                @Index(name = "idx_job_recommendations_candidate_id", columnList = "candidate_id"),
                @Index(name = "idx_job_recommendations_job_id", columnList = "job_id"),
                @Index(name = "idx_job_recommendations_overall_score", columnList = "overall_score"),
                @Index(name = "idx_job_recommendations_expires_at", columnList = "expires_at")
        }
)
@Builder
public class JobRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "overall_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Column(name = "skill_score", precision = 5, scale = 2)
    private BigDecimal skillScore;

    @Column(name = "experience_score", precision = 5, scale = 2)
    private BigDecimal experienceScore;

    @Column(name = "education_score", precision = 5, scale = 2)
    private BigDecimal educationScore;

    @Column(name = "location_score", precision = 5, scale = 2)
    private BigDecimal locationScore;

    @Column(name = "semantic_score", precision = 5, scale = 2)
    private BigDecimal semanticScore;

    @Column(name = "matching_skills", columnDefinition = "JSON")
    private String matchingSkills; // JSON list of matching skill names

    @Column(name = "missing_skills", columnDefinition = "JSON")
    private String missingSkills; // JSON list of missing skill names

    @Column(columnDefinition = "JSON")
    private String strengths; // JSON list of candidate strength strings

    @Column(name = "improvement_suggestions", columnDefinition = "JSON")
    private String improvementSuggestions;

    @Column(name = "score_details", columnDefinition = "JSON")
    private String scoreDetails; // JSON full breakdown

    @Column(name = "computed_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant computedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
