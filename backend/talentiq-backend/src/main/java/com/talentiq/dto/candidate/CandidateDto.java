package com.talentiq.dto.candidate;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.common.enums.SkillProficiency;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class CandidateDto {

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Response {
        private Long id;
        private Long userId;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        private String avatarUrl;
        private String headline;
        private String bio;
        private String location;
        private String githubUrl;
        private String linkedinUrl;
        private String websiteUrl;
        private Integer yearsExperience;
        private String currentTitle;
        private String currentCompany;
        private BigDecimal expectedSalary;
        private String availability;
        private ExperienceLevel experienceLevel;
        private boolean openToWork;
        private Integer profileCompletion;

        private List<SkillResponse> skills;
        private List<ExperienceResponse> experiences;
        private List<EducationResponse> educations;
        private List<ProjectResponse> projects;
    }

    @Data
    public static class ProfileUpdateRequest {
        private String headline;
        private String bio;
        private String location;
        private String githubUrl;
        private String linkedinUrl;
        private String websiteUrl;
        private Integer yearsExperience;
        private String currentTitle;
        private String currentCompany;
        private BigDecimal expectedSalary;
        private String availability;
        private ExperienceLevel experienceLevel;
        private Boolean openToWork;
    }

    @Data
    public static class SkillRequest {
        private String skillName;
        private SkillProficiency proficiency;
        private Integer years;
        private Boolean primary;
        private Integer displayOrder;
    }

    @Data
    @Builder
    public static class SkillResponse {
        private Long id;
        private String skillName;
        private SkillProficiency proficiency;
        private Integer years;
        private boolean primary;
        private Integer displayOrder;
    }

    @Data
    public static class ExperienceRequest {
        private String company;
        private String title;
        private String description;
        private String location;
        private String employmentType;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate startDate;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate endDate;

        private Boolean current;
        private Integer displayOrder;
    }

    @Data
    @Builder
    public static class ExperienceResponse {
        private Long id;
        private String company;
        private String title;
        private String description;
        private String location;
        private String employmentType;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate startDate;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate endDate;

        private boolean current;
        private Integer displayOrder;
    }

    @Data
    public static class EducationRequest {
        private String institution;
        private String degree;
        private String fieldOfStudy;
        private BigDecimal gpa;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate startDate;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate endDate;

        private Boolean current;
        private String description;
        private Integer displayOrder;
    }

    @Data
    @Builder
    public static class EducationResponse {
        private Long id;
        private String institution;
        private String degree;
        private String fieldOfStudy;
        private BigDecimal gpa;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate startDate;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate endDate;

        private boolean current;
        private String description;
        private Integer displayOrder;
    }

    @Data
    public static class ProjectRequest {
        private String title;
        private String description;
        private String url;
        private String githubUrl;
        private List<String> techStack;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate startDate;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate endDate;

        private Boolean featured;
        private Integer displayOrder;
    }

    @Data
    @Builder
    public static class ProjectResponse {
        private Long id;
        private String title;
        private String description;
        private String url;
        private String githubUrl;
        private List<String> techStack;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate startDate;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate endDate;

        private boolean featured;
        private Integer displayOrder;
    }
}
