package com.talentiq.dto.hr;

import com.talentiq.dto.company.CompanyDto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

public class HrDto {

    @Data
    public static class JoinRequest {
        @NotNull(message = "Company ID is required")
        private Long companyId;

        @Size(max = 150)
        private String designation;

        @Size(max = 100)
        private String department;
    }

    @Data
    public static class UpdateRequest {
        @Size(max = 150)
        private String designation;

        @Size(max = 100)
        private String department;
    }

    @Data
    @Builder
    public static class HrAchievementDto {
        private String id;
        private String title;
        private String badgeType;
        private String companyName;
        private Long companyId;
        private String companyLogoUrl;
        private String designation;
        private java.time.Instant earnedAt;
        private String description;
        private String status;
        private boolean verified;
    }

    @Data
    @Builder
    public static class Response {
        private Long id;
        private Long userId;
        private String email;
        private String firstName;
        private String lastName;
        private CompanyDto.Response company;
        private String designation;
        private String department;
        private boolean companyAdmin;
        private boolean active;
        private boolean companyVerified;
        private java.time.Instant companyVerifiedAt;
        private String companyVerifiedTitle;
        private HrAchievementDto activeBadgeAchievement;
        private java.util.List<HrAchievementDto> achievements;
    }
}
