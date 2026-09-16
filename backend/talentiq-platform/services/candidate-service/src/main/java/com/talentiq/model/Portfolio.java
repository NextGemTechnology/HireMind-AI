package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.model.Candidate;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "portfolios",
        indexes = {
                @Index(name = "idx_portfolios_candidate_id", columnList = "candidate_id"),
                @Index(name = "idx_portfolios_is_featured", columnList = "is_featured"),
                @Index(name = "idx_portfolios_category", columnList = "category")
        }
)
@Builder
public class Portfolio extends AuditEntity {

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

    @Column(length = 100)
    private String category; // WEB, MOBILE, AI_ML, DESIGN, SYSTEM

    @Column(name = "project_url", length = 500)
    private String projectUrl;

    @Column(name = "github_url", length = 500)
    private String githubUrl;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "media_urls", columnDefinition = "JSON")
    private String mediaUrls; // JSON string array

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private boolean featured = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "views_count", nullable = false)
    @Builder.Default
    private Integer viewsCount = 0;

    @Column(name = "likes_count", nullable = false)
    @Builder.Default
    private Integer likesCount = 0;

    @OneToMany(mappedBy = "portfolio", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<PortfolioItem> items = new ArrayList<>();

    public void incrementViews() {
        this.viewsCount++;
    }

    public void incrementLikes() {
        this.likesCount++;
    }
}
