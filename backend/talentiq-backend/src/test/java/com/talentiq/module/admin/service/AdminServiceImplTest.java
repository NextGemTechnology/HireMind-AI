package com.talentiq.service.admin;

import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.dto.admin.AdminDto;
import com.talentiq.repository.application.JobApplicationRepository;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.model.Company;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.dto.user.UserDto;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminService Unit Tests")
class AdminServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private JobRepository jobRepository;
    @Mock private JobApplicationRepository applicationRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private ResumeRepository resumeRepository;
    @Mock private MailService mailService;

    @InjectMocks
    private AdminServiceImpl adminService;

    private User adminUser;
    private User targetUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(1L)
                .email("admin@platform.com")
                .roles(Set.of(Role.ROLE_SUPER_ADMIN))
                .status(UserStatus.ACTIVE)
                .build();

        targetUser = User.builder()
                .id(2L)
                .email("baduser@example.com")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .status(UserStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("should suspend user account and trigger security notice email")
    void shouldSuspendUserAccountAndSendNotice() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        AdminDto.UserStatusRequest req = new AdminDto.UserStatusRequest();
        req.setEnabled(false);
        req.setReason("Terms of Service Violation");

        UserDto.Response response = adminService.setUserEnabledStatus(1L, 2L, req);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(UserStatus.SUSPENDED);

        verify(userRepository).save(targetUser);
        verify(mailService).sendSystemAlert(eq("baduser@example.com"), eq("Account Status Notice"), any());
    }

    @Test
    @DisplayName("should calculate system metrics successfully")
    void shouldCalculateSystemMetricsSuccessfully() {
        when(userRepository.count()).thenReturn(10L);
        when(userRepository.findAll()).thenReturn(Collections.singletonList(adminUser));
        when(companyRepository.findAll()).thenReturn(Collections.singletonList(Company.builder().id(100L).verified(true).build()));
        when(jobRepository.count()).thenReturn(5L);
        when(jobRepository.findAll()).thenReturn(Collections.emptyList());
        when(applicationRepository.count()).thenReturn(20L);
        when(resumeRepository.count()).thenReturn(15L);

        AdminDto.SystemMetricsResponse response = adminService.getSystemMetrics(1L);

        assertThat(response).isNotNull();
        assertThat(response.getTotalUsers()).isEqualTo(10L);
        assertThat(response.getActiveUsers()).isEqualTo(1L);
        assertThat(response.getTotalCompanies()).isEqualTo(1L);
        assertThat(response.getVerifiedCompanies()).isEqualTo(1L);
    }
}
