package com.talentiq.service.employee;

import com.talentiq.common.enums.DisbursementType;
import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.enums.SalaryStatus;
import com.talentiq.dto.employee.SalaryDto;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.infrastructure.payment.PaymentProvider;
import com.talentiq.infrastructure.payment.PaymentResult;
import com.talentiq.infrastructure.payment.PaymentStatus;
import com.talentiq.model.Company;
import com.talentiq.model.Employee;
import com.talentiq.model.HrProfile;
import com.talentiq.model.SalaryDisbursement;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.employee.EmployeeRepository;
import com.talentiq.repository.employee.SalaryDisbursementRepository;
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
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SalaryService Approval & Disbursement Unit Tests")
class SalaryServiceImplTest {

    @Mock private SalaryDisbursementRepository salaryRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private PaymentProvider paymentProvider;
    @Mock private AuditLogService auditLogService;
    @Mock private NotificationService notificationService;
    @Mock private MailService mailService;
    @Mock private StringRedisTemplate redisTemplate;

    @InjectMocks
    private SalaryServiceImpl salaryService;

    private Company testCompany;
    private User hrUser;
    private HrProfile hrProfile;
    private User candidateUser;
    private Employee testEmployee;
    private SalaryDisbursement testSalary;

    @BeforeEach
    void setUp() {
        testCompany = Company.builder().id(1L).name("Acme Corp").slug("acme").build();
        hrUser = User.builder().id(10L).email("hr@acme.com").firstName("Sarah").lastName("HR").build();
        hrProfile = HrProfile.builder().id(100L).user(hrUser).company(testCompany).email("hr@acme.com").companyVerified(true).build();
        candidateUser = User.builder().id(20L).email("candidate@example.com").firstName("Alex").lastName("Dev").build();

        testEmployee = Employee.builder()
                .id(50L)
                .company(testCompany)
                .user(candidateUser)
                .status(EmployeeStatus.ACTIVE)
                .employeeCode("EMP-ACME-0001")
                .build();

        testSalary = SalaryDisbursement.builder()
                .id(200L)
                .employee(testEmployee)
                .company(testCompany)
                .amount(new BigDecimal("150000"))
                .currency("INR")
                .periodLabel("September 2026")
                .disbursementType(DisbursementType.MONTHLY_SALARY)
                .status(SalaryStatus.DRAFT)
                .build();
    }

    @Test
    @DisplayName("Create salary record starts in DRAFT state")
    void createSalaryRecord_DraftState() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(employeeRepository.findById(50L)).thenReturn(Optional.of(testEmployee));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(salaryRepository.save(any(SalaryDisbursement.class))).thenAnswer(i -> {
            SalaryDisbursement s = i.getArgument(0);
            s.setId(200L);
            return s;
        });

        SalaryDto.CreateRequest req = SalaryDto.CreateRequest.builder()
                .employeeId(50L)
                .amount(new BigDecimal("150000"))
                .currency("INR")
                .periodLabel("September 2026")
                .build();

        SalaryDto.Response res = salaryService.createSalaryRecord(10L, req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo(SalaryStatus.DRAFT);
        assertThat(res.getAmount()).isEqualByComparingTo("150000");
    }

    @Test
    @DisplayName("Submit salary transitions DRAFT -> PENDING_APPROVAL")
    void submitSalaryForApproval_PendingState() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(salaryRepository.findById(200L)).thenReturn(Optional.of(testSalary));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(salaryRepository.save(any(SalaryDisbursement.class))).thenAnswer(i -> i.getArgument(0));

        SalaryDto.Response res = salaryService.submitSalaryForApproval(10L, 200L);

        assertThat(res.getStatus()).isEqualTo(SalaryStatus.PENDING_APPROVAL);
        assertThat(res.getSubmittedAt()).isNotNull();
    }

    @Test
    @DisplayName("Approve salary invokes payment provider and transitions to COMPLETED")
    void decideSalaryApproval_Approved_TriggersPayment_Completed() {
        testSalary.setStatus(SalaryStatus.PENDING_APPROVAL);

        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(salaryRepository.findById(200L)).thenReturn(Optional.of(testSalary));
        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(paymentProvider.getProviderName()).thenReturn("MOCK");
        when(paymentProvider.initiateDisbursement(any())).thenReturn(PaymentResult.builder()
                .status(PaymentStatus.SUCCESS)
                .transactionRef("MOCK-TXN-12345678")
                .timestamp(Instant.now())
                .build());
        when(salaryRepository.save(any(SalaryDisbursement.class))).thenAnswer(i -> i.getArgument(0));

        SalaryDto.ApprovalDecisionRequest req = SalaryDto.ApprovalDecisionRequest.builder()
                .approved(true)
                .build();

        SalaryDto.Response res = salaryService.decideSalaryApproval(10L, 200L, req);

        assertThat(res.getStatus()).isEqualTo(SalaryStatus.COMPLETED);
        assertThat(res.getTransactionRef()).isEqualTo("MOCK-TXN-12345678");
        assertThat(res.getPaymentStatus()).isEqualTo("SUCCESS");
        verify(paymentProvider).initiateDisbursement(testSalary);
    }
}
