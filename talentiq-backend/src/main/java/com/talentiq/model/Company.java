package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import jakarta.persistence.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "companies",
        indexes = {
                @Index(name = "idx_companies_slug", columnList = "slug", unique = true),
                @Index(name = "idx_companies_industry", columnList = "industry"),
                @Index(name = "idx_companies_is_verified", columnList = "is_verified"),
                @Index(name = "idx_companies_is_active", columnList = "is_active"),
                @Index(name = "idx_companies_created_at", columnList = "created_at")
        }
)
@Builder
public class Company extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    @Column(length = 500)
    private String website;

    @Column(length = 100)
    private String industry;

    @Column(name = "company_size", length = 30)
    private String companySize; // STARTUP, SMALL, MEDIUM, LARGE, ENTERPRISE

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "banner_url", length = 500)
    private String bannerUrl;

    @Column(length = 200)
    private String location;

    @Column(name = "founded_year")
    private Integer foundedYear;

    @Column(length = 255)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    @Column(name = "twitter_url", length = 500)
    private String twitterUrl;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_blacklisted", nullable = false)
    @Builder.Default
    private boolean blacklisted = false;
}
