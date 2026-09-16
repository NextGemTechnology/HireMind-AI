package com.talentiq.model;
import lombok.*;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "resume_parsed_data")
@Builder
public class ResumeParsedData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resume_id", nullable = false, unique = true)
    private Resume resume;

    @Column(name = "raw_text", columnDefinition = "LONGTEXT")
    private String rawText;

    @Column(name = "extracted_skills", columnDefinition = "JSON")
    private String extractedSkills; // JSON list of skills

    @Column(name = "extracted_experience", columnDefinition = "JSON")
    private String extractedExperience; // JSON list of experience

    @Column(name = "extracted_education", columnDefinition = "JSON")
    private String extractedEducation; // JSON list of education

    @Column(name = "extracted_projects", columnDefinition = "JSON")
    private String extractedProjects; // JSON list of projects

    @Column(name = "extracted_certifications", columnDefinition = "JSON")
    private String extractedCertifications; // JSON list of certifications

    @Column(name = "extracted_languages", columnDefinition = "JSON")
    private String extractedLanguages; // JSON list of languages

    @Column(name = "extracted_summary", columnDefinition = "TEXT")
    private String extractedSummary;

    @Column(name = "extracted_name", length = 200)
    private String extractedName;

    @Column(name = "extracted_email", length = 255)
    private String extractedEmail;

    @Column(name = "extracted_phone", length = 50)
    private String extractedPhone;

    @Column(name = "extracted_location", length = 200)
    private String extractedLocation;

    @Column(name = "extracted_github", length = 500)
    private String extractedGithub;

    @Column(name = "extracted_linkedin", length = 500)
    private String extractedLinkedin;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(name = "ai_resume_score", precision = 5, scale = 2)
    private BigDecimal aiResumeScore;

    @Column(name = "ai_recommendations", columnDefinition = "JSON")
    private String aiRecommendations; // JSON suggestions

    @Column(name = "parser_model", length = 100)
    private String parserModel;

    @Column(name = "parsed_at", nullable = false)
    @Builder.Default
    private Instant parsedAt = Instant.now();
}
