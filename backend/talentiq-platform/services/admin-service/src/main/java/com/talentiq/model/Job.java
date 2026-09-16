package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.common.enums.JobStatus;
import com.talentiq.common.enums.JobType;
import com.talentiq.model.Company;
import com.talentiq.model.User;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "jobs",
        indexes = {
                @Index(name = "idx_jobs_company_id", columnList = "company_id"),
                @Index(name = "idx_jobs_posted_by", columnList = "posted_by"),
                @Index(name = "idx_jobs_status", columnList = "status"),
                @Index(name = "idx_jobs_job_type", columnList = "job_type"),
                @Index(name = "idx_jobs_experience_level", columnList = "experience_level"),
                @Index(name = "idx_jobs_is_remote", columnList = "is_remote"),
                @Index(name = "idx_jobs_location", columnList = "location"),
                @Index(name = "idx_jobs_expires_at", columnList = "expires_at"),
                @Index(name = "idx_jobs_created_at", columnList = "created_at")
        }
)
@Builder
public class Job extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by")
    private User postedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_profile_id")
    private HrProfile hrProfile;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 250)
    private String slug;

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String responsibilities;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false, length = 30)
    @Builder.Default
    private JobType jobType = JobType.FULL_TIME;

    @Column(length = 200)
    private String location;

    @Column(name = "is_remote", nullable = false)
    @Builder.Default
    private boolean remote = false;

    @Column(name = "is_hybrid", nullable = false)
    @Builder.Default
    private boolean hybrid = false;

    @Column(name = "salary_min", precision = 12, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 2)
    private BigDecimal salaryMax;

    @Column(name = "salary_currency", nullable = false, length = 10)
    @Builder.Default
    private String salaryCurrency = "USD";

    @Column(name = "salary_period", nullable = false, length = 20)
    @Builder.Default
    private String salaryPeriod = "YEARLY";

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", nullable = false, length = 20)
    @Builder.Default
    private ExperienceLevel experienceLevel = ExperienceLevel.MID;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private JobStatus status = JobStatus.DRAFT;

    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private Integer openings = 1;

    @Column(name = "views_count", nullable = false)
    @Builder.Default
    private Integer viewsCount = 0;

    @Column(name = "applications_count", nullable = false)
    @Builder.Default
    private Integer applicationsCount = 0;

    @Column(name = "embedding_json", columnDefinition = "LONGTEXT")
    private String embeddingJson;

    @Column(name = "embedding_hash", length = 64)
    private String embeddingHash;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<JobSkill> requiredSkills = new ArrayList<>();

    public void incrementViews() {
        this.viewsCount++;
    }

    public void incrementApplications() {
        this.applicationsCount++;
    }
}
