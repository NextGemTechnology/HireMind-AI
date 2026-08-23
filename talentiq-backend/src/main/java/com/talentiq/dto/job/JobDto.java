package com.talentiq.dto.job;

import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.common.enums.JobStatus;
import com.talentiq.common.enums.JobType;
import com.talentiq.dto.company.CompanyDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;

public class JobDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Job title is required")
        @Size(max = 200)
        private String title;

        @Size(max = 250)
        private String slug;

        @NotBlank(message = "Job description is required")
        private String description;

        private String responsibilities;
        private String requirements;

        @NotNull(message = "Job type is required")
        private JobType jobType;

        private String location;
        private Boolean remote;
        private Boolean hybrid;
        private BigDecimal salaryMin;
        private BigDecimal salaryMax;
        private String salaryCurrency;
        private String salaryPeriod;

        @NotNull(message = "Experience level is required")
        private ExperienceLevel experienceLevel;

        private JobStatus status;
        private LocalDate applicationDeadline;
        private Integer openings;

        private List<SkillDto> requiredSkills;
    }

    @Data
    public static class UpdateRequest {
        @Size(max = 200)
        private String title;

        private String description;
        private String responsibilities;
        private String requirements;
        private JobType jobType;
        private String location;
        private Boolean remote;
        private Boolean hybrid;
        private BigDecimal salaryMin;
        private BigDecimal salaryMax;
        private String salaryCurrency;
        private String salaryPeriod;
        private ExperienceLevel experienceLevel;
        private JobStatus status;
        private LocalDate applicationDeadline;
        private Integer openings;

        private List<SkillDto> requiredSkills;
    }

    @Data
    @Builder
    public static class Response {
        private Long id;
        private CompanyDto.Response company;
        private Long postedById;
        private String title;
        private String slug;
        private String description;
        private String responsibilities;
        private String requirements;
        private JobType jobType;
        private String location;
        private boolean remote;
        private boolean hybrid;
        private BigDecimal salaryMin;
        private BigDecimal salaryMax;
        private String salaryCurrency;
        private String salaryPeriod;
        private ExperienceLevel experienceLevel;
        private JobStatus status;
        private LocalDate applicationDeadline;
        private Instant expiresAt;
        private Integer openings;
        private Integer viewsCount;
        private Integer applicationsCount;
        private List<SkillDto> requiredSkills;
        private Instant createdAt;
    }

    @Data
    @Builder
    public static class SkillDto {
        private String skillName;
        private boolean required;
        private Integer displayOrder;
    }
}
