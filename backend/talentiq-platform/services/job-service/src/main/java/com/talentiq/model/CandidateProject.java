package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import jakarta.persistence.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "candidate_projects",
        indexes = {
                @Index(name = "idx_candidate_projects_candidate_id", columnList = "candidate_id"),
                @Index(name = "idx_candidate_projects_is_featured", columnList = "is_featured")
        }
)
@Builder
public class CandidateProject extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String url;

    @Column(name = "github_url", length = 500)
    private String githubUrl;

    @Column(name = "tech_stack", columnDefinition = "JSON")
    private String techStack; // JSON string array of tech

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private boolean featured = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
