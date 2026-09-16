package com.talentiq.dto.recommendation;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecommendationStatusDto {
    private boolean hasResume;
    private int resumeCount;
    private String activeResumeName;
    private Long activeResumeId;
    private String parseStatus;
    private boolean isParsed;
    private int profileSkillsCount;
    private List<String> candidateSkills;
    private List<String> extractedSkills;
    private int profileCompletion;
    private long totalMatchingJobs;
    private long highMatchJobsCount; // >= 85% match
}
