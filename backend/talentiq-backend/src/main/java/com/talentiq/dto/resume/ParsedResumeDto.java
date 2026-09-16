package com.talentiq.dto.resume;

import com.talentiq.common.enums.SkillProficiency;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class ParsedResumeDto {
    private String name;
    private String email;
    private String phone;
    private String location;
    private String github;
    private String linkedin;
    private String summary;
    private List<Skill> skills;
    private List<Experience> experiences;
    private List<Education> educations;
    private List<Project> projects;
    private List<String> certifications;
    private List<String> languages;
    private Integer yearsOfExperience;
    private Double resumeScore;
    private List<String> improvements;

    @Data
    public static class Skill {
        private String skillName;
        private SkillProficiency proficiency;
        private Integer years;
        private boolean primary;
    }

    @Data
    public static class Experience {
        private String company;
        private String title;
        private String description;
        private String location;
        private String employmentType;
        private LocalDate startDate;
        private LocalDate endDate;
        private boolean current;
    }

    @Data
    public static class Education {
        private String institution;
        private String degree;
        private String fieldOfStudy;
        private Double gpa;
        private LocalDate startDate;
        private LocalDate endDate;
        private boolean current;
        private String description;
    }

    @Data
    public static class Project {
        private String title;
        private String description;
        private String url;
        private String githubUrl;
        private List<String> techStack;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}
