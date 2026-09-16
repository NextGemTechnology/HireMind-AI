package com.talentiq.model;
import lombok.*;

import jakarta.persistence.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "job_skills",
        uniqueConstraints = @UniqueConstraint(name = "uk_job_skills_job_skill", columnNames = {"job_id", "skill_name"}),
        indexes = {
                @Index(name = "idx_job_skills_job_id", columnList = "job_id"),
                @Index(name = "idx_job_skills_skill_name", columnList = "skill_name")
        }
)
@Builder
public class JobSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "skill_name", nullable = false, length = 100)
    private String skillName;

    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private boolean required = true;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
