package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.model.User;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "candidates",
        indexes = {
                @Index(name = "idx_candidates_location", columnList = "location"),
                @Index(name = "idx_candidates_experience_level", columnList = "experience_level"),
                @Index(name = "idx_candidates_is_open_to_work", columnList = "is_open_to_work"),
                @Index(name = "idx_candidates_created_at", columnList = "created_at")
        }
)
@Builder
public class Candidate extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 200)
    private String headline;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(length = 150)
    private String location;

    @Column(name = "github_url", length = 500)
    private String githubUrl;

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    @Column(name = "website_url", length = 500)
    private String websiteUrl;

    @Column(name = "years_experience")
    @Builder.Default
    private Integer yearsExperience = 0;

    @Column(name = "current_title", length = 150)
    private String currentTitle;

    @Column(name = "current_company", length = 150)
    private String currentCompany;

    @Column(name = "expected_salary", precision = 12, scale = 2)
    private BigDecimal expectedSalary;

    @Column(length = 50)
    private String availability;

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", length = 20)
    private ExperienceLevel experienceLevel;

    @Column(name = "is_open_to_work", nullable = false)
    @Builder.Default
    private boolean openToWork = true;

    @Column(name = "profile_completion", nullable = false)
    @Builder.Default
    private Integer profileCompletion = 0;

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<CandidateSkill> skills = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<CandidateExperience> experiences = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<CandidateEducation> educations = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<CandidateProject> projects = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<CandidateCertification> certifications = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<CandidateLanguage> languages = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<CandidateAchievement> achievements = new ArrayList<>();

    public void calculateProfileCompletion() {
        int score = 20; // Basic user account exists
        if (headline != null && !headline.isBlank()) score += 10;
        if (bio != null && !bio.isBlank()) score += 10;
        if (location != null && !location.isBlank()) score += 10;
        if (skills != null && !skills.isEmpty()) score += 15;
        if (experiences != null && !experiences.isEmpty()) score += 15;
        if (educations != null && !educations.isEmpty()) score += 10;
        if (projects != null && !projects.isEmpty()) score += 10;
        this.profileCompletion = Math.min(100, score);
    }
}
