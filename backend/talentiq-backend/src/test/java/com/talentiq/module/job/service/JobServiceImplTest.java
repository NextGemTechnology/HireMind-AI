package com.talentiq.service.job;

import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.common.enums.JobStatus;
import com.talentiq.common.enums.JobType;
import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.model.Company;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.dto.job.JobDto;
import com.talentiq.model.Job;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.job.JobSkillRepository;
import com.talentiq.repository.job.SavedJobRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JobService Unit Tests")
class JobServiceImplTest {

    @Mock private JobRepository jobRepository;
    @Mock private JobSkillRepository jobSkillRepository;
    @Mock private SavedJobRepository savedJobRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private com.talentiq.service.company.CompanySecurityService companySecurityService;

    @InjectMocks
    private JobServiceImpl jobService;

    private User hrUser;
    private Company company;
    private HrProfile hrProfile;
    private JobDto.CreateRequest createReq;

    @BeforeEach
    void setUp() {
        hrUser = User.builder()
                .id(1L)
                .email("hr@techcorp.com")
                .roles(Set.of(Role.ROLE_HR))
                .build();

        company = Company.builder()
                .id(100L)
                .name("Tech Corp")
                .build();

        hrProfile = HrProfile.builder()
                .id(10L)
                .user(hrUser)
                .company(company)
                .companyAdmin(true)
                .build();

        createReq = new JobDto.CreateRequest();
        createReq.setTitle("Backend Engineer");
        createReq.setSlug("backend-engineer");
        createReq.setDescription("Spring Boot backend engineer job");
        createReq.setJobType(JobType.FULL_TIME);
        createReq.setExperienceLevel(ExperienceLevel.MID);
    }

    @Test
    @DisplayName("should post job successfully and link company context")
    void shouldCreateJobSuccessfully() {
        when(companySecurityService.enforceVerifiedHrAccess(1L)).thenReturn(hrProfile);
        when(jobRepository.existsBySlug("backend-engineer")).thenReturn(false);
        when(jobRepository.save(any(Job.class))).thenAnswer(i -> {
            Job j = i.getArgument(0);
            j.setId(1000L);
            return j;
        });

        JobDto.Response response = jobService.createJob(1L, createReq);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1000L);
        assertThat(response.getTitle()).isEqualTo("Backend Engineer");
        assertThat(response.getCompany().getId()).isEqualTo(100L);

        verify(jobRepository).save(any(Job.class));
    }

    @Test
    @DisplayName("should throw ForbiddenException if user has no HR Profile context")
    void shouldThrowForbiddenIfUserNotHr() {
        when(companySecurityService.enforceVerifiedHrAccess(2L))
                .thenThrow(new ForbiddenException("Access Denied: Only company HR members can post jobs"));

        assertThatThrownBy(() -> jobService.createJob(2L, createReq))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("HR members");
    }
}
