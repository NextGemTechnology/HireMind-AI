package com.talentiq.model;
import lombok.*;

import jakarta.persistence.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "portfolio_items",
        indexes = {
                @Index(name = "idx_portfolio_items_portfolio_id", columnList = "portfolio_id")
        }
)
@Builder
public class PortfolioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @Column(name = "media_type", nullable = false, length = 30)
    @Builder.Default
    private String mediaType = "IMAGE"; // IMAGE, VIDEO, DOCUMENT

    @Column(name = "media_url", nullable = false, length = 500)
    private String mediaUrl;

    @Column(length = 255)
    private String caption;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
