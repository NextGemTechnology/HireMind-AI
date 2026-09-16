package com.talentiq.service.candidate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.Role;
import com.talentiq.dto.candidate.CandidateDto;
import com.talentiq.model.Candidate;
import com.talentiq.model.CandidateSkill;
import com.talentiq.repository.candidate.*;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CandidateService Unit Tests")
class CandidateServiceImplTest {

    @Mock private CandidateRepository candidateRepository;
    @Mock private CandidateSkillRepository skillRepository;
    @Mock private CandidateExperienceRepository experienceRepository;
    @Mock private CandidateEducationRepository educationRepository;
    @Mock private CandidateProjectRepository projectRepository;
    @Mock private UserRepository userRepository;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private CandidateServiceImpl candidateService;

    private User testUser;
    private Candidate testCandidate;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("candidate@example.com")
                .firstName("Alice")
                .lastName("Smith")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .build();

        testCandidate = Candidate.builder()
                .id(10L)
                .user(testUser)
                .headline("Software Engineer")
                .profileCompletion(30)
                .skills(new ArrayList<>())
                .experiences(new ArrayList<>())
                .educations(new ArrayList<>())
                .projects(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("should return candidate profile by userId")
    void shouldReturnProfileByUserId() {
        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(testCandidate));

        CandidateDto.Response response = candidateService.getProfileByUserId(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getEmail()).isEqualTo("candidate@example.com");
        assertThat(response.getHeadline()).isEqualTo("Software Engineer");
    }

    @Test
    @DisplayName("should update candidate profile fields")
    void shouldUpdateProfileFields() {
        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(testCandidate));
        when(candidateRepository.save(any(Candidate.class))).thenAnswer(i -> i.getArgument(0));

        CandidateDto.ProfileUpdateRequest request = new CandidateDto.ProfileUpdateRequest();
        request.setHeadline("Senior Fullstack Engineer");
        request.setLocation("San Francisco, CA");

        CandidateDto.Response response = candidateService.updateProfile(1L, request);

        assertThat(response.getHeadline()).isEqualTo("Senior Fullstack Engineer");
        assertThat(response.getLocation()).isEqualTo("San Francisco, CA");
    }

    @Test
    @DisplayName("should add skill to candidate profile")
    void shouldAddSkillToProfile() {
        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(testCandidate));
        when(skillRepository.save(any(CandidateSkill.class))).thenAnswer(i -> {
            CandidateSkill cs = i.getArgument(0);
            cs.setId(10L);
            return cs;
        });
        when(candidateRepository.save(any(Candidate.class))).thenAnswer(i -> i.getArgument(0));

        CandidateDto.SkillRequest skillReq = new CandidateDto.SkillRequest();
        skillReq.setSkillName("Java");
        skillReq.setYears(5);

        CandidateDto.Response response = candidateService.addSkill(1L, skillReq);

        assertThat(response.getSkills()).hasSize(1);
        assertThat(response.getSkills().get(0).getSkillName()).isEqualTo("Java");
    }
}
