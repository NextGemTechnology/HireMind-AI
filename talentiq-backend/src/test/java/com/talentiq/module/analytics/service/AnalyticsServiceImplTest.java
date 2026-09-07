package com.talentiq.service.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.Role;
import com.talentiq.dto.analytics.AnalyticsDto;
import com.talentiq.repository.analytics.AnalyticsEventRepository;
import com.talentiq.repository.analytics.HrAnalyticsSnapshotRepository;
import com.talentiq.repository.application.JobApplicationRepository;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.model.Company;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.resume.ResumeRepository;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AnalyticsService Unit Tests")
class AnalyticsServiceImplTest {

    @Mock private AnalyticsEventRepository eventRepository;
    @Mock private HrAnalyticsSnapshotRepository snapshotRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private JobRepository jobRepository;
    @Mock private JobApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private ResumeRepository resumeRepository;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private AnalyticsServiceImpl analyticsService;

    private User hrUser;
    private Company company;
    private HrProfile hrProfile;

    @BeforeEach
    void setUp() {
        hrUser = User.builder()
                .id(1L)
                .email("hr@acme.com")
                .roles(Set.of(Role.ROLE_HR))
                .build();

        company = Company.builder()
                .id(100L)
                .name("Acme Corp")
                .build();

        hrProfile = HrProfile.builder()
                .id(10L)
                .user(hrUser)
                .company(company)
                .companyVerified(true)
                .build();
    }

    @Test
    @DisplayName("should aggregate HR dashboard analytics successfully")
    void shouldGetHrDashboardAnalyticsSuccessfully() {
        when(hrProfileRepository.findByUserId(1L)).thenReturn(Optional.of(hrProfile));
        when(jobRepository.findAllByCompanyId(eq(100L), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));

        AnalyticsDto.HrDashboardResponse response = analyticsService.getHrAnalyticsDashboard(1L);

        assertThat(response).isNotNull();
        assertThat(response.getCompanyId()).isEqualTo(100L);
        assertThat(response.getCompanyName()).isEqualTo("Acme Corp");
        assertThat(response.getActiveJobsCount()).isEqualTo(0L);
    }

    @Test
    @DisplayName("should calculate platform overview metrics successfully")
    void shouldGetPlatformOverviewSuccessfully() {
        when(userRepository.count()).thenReturn(100L);
        when(candidateRepository.count()).thenReturn(80L);
        when(companyRepository.count()).thenReturn(10L);
        when(jobRepository.count()).thenReturn(25L);
        when(applicationRepository.count()).thenReturn(150L);
        when(resumeRepository.count()).thenReturn(75L);

        AnalyticsDto.PlatformOverviewResponse response = analyticsService.getPlatformOverview(1L);

        assertThat(response).isNotNull();
        assertThat(response.getTotalUsersCount()).isEqualTo(100L);
        assertThat(response.getTotalCandidatesCount()).isEqualTo(80L);
        assertThat(response.getTotalCompaniesCount()).isEqualTo(10L);
        assertThat(response.getTotalJobsCount()).isEqualTo(25L);
        assertThat(response.getTotalApplicationsCount()).isEqualTo(150L);
    }
}
