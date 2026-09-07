package com.talentiq.service.employee;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.enums.EmploymentType;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.dto.employee.EmployeeDto;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.model.*;
import com.talentiq.repository.company.CompanyCandidateVerificationRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.employee.EmployeeRepository;
import com.talentiq.repository.employee.EmployeeStatusHistoryRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.service.admin.AuditLogService;
import com.talentiq.service.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmployeeService Lifecycle Unit Tests")
class EmployeeServiceImplTest {

    @Mock private EmployeeRepository employeeRepository;
    @Mock private EmployeeStatusHistoryRepository statusHistoryRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private CompanyCandidateVerificationRepository verificationRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private NotificationService notificationService;
    @Mock private MailService mailService;
    @Mock private StringRedisTemplate redisTemplate;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    private Company testCompany;
    private User hrUser;
    private HrProfile hrProfile;
    private User candidateUser;
    private Employee testEmployee;

    @BeforeEach
    void setUp() {
        testCompany = Company.builder()
                .id(1L)
                .name("Acme Corp")
                .slug("acme")
                .build();

        hrUser = User.builder()
                .id(10L)
                .email("hr@acme.com")
                .firstName("Sarah")
                .lastName("Recruiter")
                .build();

        hrProfile = HrProfile.builder()
                .id(100L)
                .user(hrUser)
                .company(testCompany)
                .email("hr@acme.com")
                .companyVerified(true)
                .build();

        candidateUser = User.builder()
                .id(20L)
                .email("candidate@example.com")
                .firstName("Alex")
                .lastName("Coder")
                .build();

        testEmployee = Employee.builder()
                .id(50L)
                .company(testCompany)
                .user(candidateUser)
                .hrProfile(hrProfile)
                .employeeCode("EMP-ACME-0001")
                .jobTitle("Software Engineer")
                .department("Engineering")
                .employmentType(EmploymentType.FULL_TIME)
                .status(EmployeeStatus.PENDING_VERIFICATION)
                .baseSalary(new BigDecimal("100000"))
                .build();
    }

    @Test
    @DisplayName("Onboard candidate creates PENDING_VERIFICATION employee and records audit")
    void onboardEmployee_Success() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(candidateUser));
        when(employeeRepository.findByCompanyIdAndUserId(1L, 20L)).thenReturn(Optional.empty());
        when(employeeRepository.countByCompanyId(1L)).thenReturn(0L);
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> {
            Employee e = i.getArgument(0);
            e.setId(50L);
            return e;
        });

        EmployeeDto.OnboardRequest req = EmployeeDto.OnboardRequest.builder()
                .candidateUserId(20L)
                .jobTitle("Software Engineer")
                .department("Engineering")
                .employmentType(EmploymentType.FULL_TIME)
                .baseSalary(new BigDecimal("100000"))
                .build();

        EmployeeDto.Response res = employeeService.onboardEmployee(10L, req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo(EmployeeStatus.PENDING_VERIFICATION);
        assertThat(res.getEmployeeCode()).isEqualTo("EMP-ACME-0001");
        verify(auditLogService).recordSuccess(eq(10L), eq("hr@acme.com"), eq("EMPLOYEE_ONBOARDED"), eq("Employee"), eq(50L), any(), any());
    }

    @Test
    @DisplayName("Onboard duplicate candidate throws ConflictException")
    void onboardEmployee_DuplicateThrowsConflict() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(candidateUser));
        when(employeeRepository.findByCompanyIdAndUserId(1L, 20L)).thenReturn(Optional.of(testEmployee));

        EmployeeDto.OnboardRequest req = EmployeeDto.OnboardRequest.builder()
                .candidateUserId(20L)
                .jobTitle("Software Engineer")
                .build();

        assertThatThrownBy(() -> employeeService.onboardEmployee(10L, req))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("Company Manager verifies employee -> status ACTIVE")
    void verifyEmployee_Approved_Success() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(employeeRepository.findById(50L)).thenReturn(Optional.of(testEmployee));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeDto.VerificationDecisionRequest req = EmployeeDto.VerificationDecisionRequest.builder()
                .approved(true)
                .build();

        EmployeeDto.Response res = employeeService.verifyEmployee(10L, 50L, req);

        assertThat(res.getStatus()).isEqualTo(EmployeeStatus.ACTIVE);
        assertThat(res.getVerifiedAt()).isNotNull();
        verify(auditLogService).recordSuccess(eq(10L), any(), eq("EMPLOYEE_VERIFIED"), eq("Employee"), eq(50L), any(), any());
    }

    @Test
    @DisplayName("HR initiates termination -> status ON_NOTICE")
    void requestTermination_Success() {
        testEmployee.setStatus(EmployeeStatus.ACTIVE);
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(employeeRepository.findById(50L)).thenReturn(Optional.of(testEmployee));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeDto.TerminationRequest req = EmployeeDto.TerminationRequest.builder()
                .reason("Resignation")
                .noticePeriodDays(30)
                .build();

        EmployeeDto.Response res = employeeService.requestTermination(10L, 50L, req);

        assertThat(res.getStatus()).isEqualTo(EmployeeStatus.ON_NOTICE);
        assertThat(res.getTerminationStatus()).isEqualTo("PENDING_APPROVAL");
        verify(auditLogService).recordSuccess(eq(10L), any(), eq("TERMINATION_REQUESTED"), eq("Employee"), eq(50L), any(), any());
    }

    @Test
    @DisplayName("Company Manager approves termination -> status TERMINATED")
    void decideTermination_Approved_Success() {
        testEmployee.setStatus(EmployeeStatus.ON_NOTICE);
        testEmployee.setTerminationStatus("PENDING_APPROVAL");

        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(employeeRepository.findById(50L)).thenReturn(Optional.of(testEmployee));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeDto.TerminationDecisionRequest req = EmployeeDto.TerminationDecisionRequest.builder()
                .approved(true)
                .notes("All handover completed")
                .build();

        EmployeeDto.Response res = employeeService.decideTermination(10L, 50L, req);

        assertThat(res.getStatus()).isEqualTo(EmployeeStatus.TERMINATED);
        assertThat(res.getTerminationStatus()).isEqualTo("APPROVED");
        verify(auditLogService).recordSuccess(eq(10L), any(), eq("TERMINATION_APPROVED"), eq("Employee"), eq(50L), any(), any());
    }

    @Test
    @DisplayName("Cross-company access violation throws ForbiddenException")
    void crossCompanyAccess_ThrowsForbidden() {
        Company otherCompany = Company.builder().id(99L).name("Other Corp").build();
        testEmployee.setCompany(otherCompany);

        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(employeeRepository.findById(50L)).thenReturn(Optional.of(testEmployee));

        assertThatThrownBy(() -> employeeService.getEmployeeById(10L, 50L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Cross-company access violation");
    }

    @Test
    @DisplayName("Suspend and reinstate lifecycle flow")
    void suspendAndReinstate_Success() {
        testEmployee.setStatus(EmployeeStatus.ACTIVE);
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(employeeRepository.findById(50L)).thenReturn(Optional.of(testEmployee));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        // 1. Suspend
        EmployeeDto.Response suspendRes = employeeService.suspendEmployee(10L, 50L,
                EmployeeDto.SuspendRequest.builder().reason("Investigation").build());
        assertThat(suspendRes.getStatus()).isEqualTo(EmployeeStatus.SUSPENDED);

        // 2. Reinstate
        EmployeeDto.Response reinstateRes = employeeService.reinstateEmployee(10L, 50L);
        assertThat(reinstateRes.getStatus()).isEqualTo(EmployeeStatus.ACTIVE);
    }
}
