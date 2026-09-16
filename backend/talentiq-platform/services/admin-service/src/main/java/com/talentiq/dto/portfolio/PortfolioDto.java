package com.talentiq.dto.portfolio;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

public class PortfolioDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Portfolio title is required")
        @Size(max = 200)
        private String title;

        private String description;
        private String category;
        private String projectUrl;
        private String githubUrl;
        private String thumbnailUrl;
        private Boolean featured;
        private Integer displayOrder;
        private List<ItemDto> items;
    }

    @Data
    public static class UpdateRequest {
        @Size(max = 200)
        private String title;

        private String description;
        private String category;
        private String projectUrl;
        private String githubUrl;
        private String thumbnailUrl;
        private Boolean featured;
        private Integer displayOrder;
        private List<ItemDto> items;
    }

    @Data
    @Builder
    public static class Response {
        private Long id;
        private Long candidateId;
        private String title;
        private String description;
        private String category;
        private String projectUrl;
        private String githubUrl;
        private String thumbnailUrl;
        private boolean featured;
        private Integer displayOrder;
        private Integer viewsCount;
        private Integer likesCount;
        private List<ItemDto> items;
        private Instant createdAt;
    }

    @Data
    @Builder
    public static class ItemDto {
        private Long id;
        private String mediaType;
        private String mediaUrl;
        private String caption;
        private Integer displayOrder;
    }
}
