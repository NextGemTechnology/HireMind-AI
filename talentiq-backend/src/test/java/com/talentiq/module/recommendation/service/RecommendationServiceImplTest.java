package com.talentiq.service.recommendation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.common.enums.JobType;
import com.talentiq.model.Candidate;
import com.talentiq.model.CandidateSkill;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.model.Job;
import com.talentiq.model.JobSkill;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.dto.recommendation.RecommendationDto;
import com.talentiq.model.JobRecommendation;
import com.talentiq.repository.recommendation.JobRecommendationRepository;
import com.talentiq.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecommendationService Unit Tests")
class RecommendationServiceImplTest {

    @Mock private JobRecommendationRepository recommendationRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private JobRepository jobRepository;
    @Mock private com.talentiq.repository.resume.ResumeRepository resumeRepository;

    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private RecommendationServiceImpl recommendationService;

    private Candidate candidate;
    private Job job;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .id(1L)
                .email("candidate@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        candidate = Candidate.builder()
                .id(10L)
                .user(user)
                .yearsExperience(3)
                .skills(new ArrayList<>())
                .build();

        candidate.getSkills().add(CandidateSkill.builder()
                .skillName("Java")
                .build());

        job = Job.builder()
                .id(20L)
                .title("Backend Java Dev")
                .slug("backend-java-dev")
                .experienceLevel(ExperienceLevel.MID)
                .jobType(JobType.FULL_TIME)
                .requiredSkills(new ArrayList<>())
                .postedBy(User.builder().id(2L).build())
                .build();

        job.getRequiredSkills().add(JobSkill.builder()
                .skillName("Java")
                .required(true)
                .build());
    }

    @Test
    @DisplayName("should compute recommendation match score correctly with weighted averages")
    void shouldComputeMatchScoreSuccessfully() {
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(jobRepository.findById(20L)).thenReturn(Optional.of(job));
        when(recommendationRepository.findByCandidateIdAndJobId(10L, 20L)).thenReturn(Optional.empty());
        when(recommendationRepository.save(any(JobRecommendation.class))).thenAnswer(i -> i.getArgument(0));

        RecommendationDto response = recommendationService.computeRecommendationMatch(10L, 20L);

        assertThat(response).isNotNull();
        // Skills match exactly (1/1 required) -> 100%. Experience match exactly (3/3 estimated mid) -> 100%.
        // Location (neither set) -> 50%. Education -> 80%.
        assertThat(response.getOverallScore()).isGreaterThan(BigDecimal.valueOf(80.0));
        assertThat(response.getSkillScore()).isEqualByComparingTo(BigDecimal.valueOf(100.00));
        assertThat(response.getExperienceScore()).isEqualByComparingTo(BigDecimal.valueOf(100.00));
        assertThat(response.getMatchingSkills()).contains("Java");

        verify(recommendationRepository).save(any(JobRecommendation.class));
    }
}
