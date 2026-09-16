package com.talentiq.dto.recommendation;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.talentiq.dto.candidate.CandidateDto;
import com.talentiq.dto.job.JobDto;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecommendationDto {
    private Long id;
    private JobDto.Response job;
    private CandidateDto.Response candidate;
    private BigDecimal overallScore;
    private BigDecimal skillScore;
    private BigDecimal experienceScore;
    private BigDecimal educationScore;
    private BigDecimal locationScore;
    private BigDecimal semanticScore;
    private List<String> matchingSkills;
    private List<String> missingSkills;
    private List<String> strengths;
    private List<String> improvementSuggestions;
}
