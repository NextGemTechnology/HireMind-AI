package com.talentiq.model;
import lombok.*;

import com.talentiq.common.enums.SkillProficiency;
import jakarta.persistence.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "candidate_skills",
        uniqueConstraints = @UniqueConstraint(name = "uk_candidate_skills_candidate_skill", columnNames = {"candidate_id", "skill_name"}),
        indexes = {
                @Index(name = "idx_candidate_skills_candidate_id", columnList = "candidate_id"),
                @Index(name = "idx_candidate_skills_skill_name", columnList = "skill_name"),
                @Index(name = "idx_candidate_skills_is_primary", columnList = "is_primary")
        }
)
@Builder
public class CandidateSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "skill_name", nullable = false, length = 100)
    private String skillName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SkillProficiency proficiency = SkillProficiency.INTERMEDIATE;

    @Column
    @Builder.Default
    private Integer years = 0;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private boolean primary = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
