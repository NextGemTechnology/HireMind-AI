package com.talentiq.service.employee;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.EmployeePerformanceDto;
import com.talentiq.model.Company;
import com.talentiq.model.Employee;
import com.talentiq.model.EmployeePerformanceReview;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.employee.EmployeePerformanceRepository;
import com.talentiq.repository.employee.EmployeeRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeePerformanceServiceTest {

    @Mock private EmployeePerformanceRepository performanceRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private EmployeePerformanceServiceImpl performanceService;

    private Company company;
    private User reviewerUser;
    private User candidateUser;
    private Employee employee;
    private HrProfile hrProfile;

    @BeforeEach
    void setUp() {
        company = Company.builder().id(1L).name("NextGen Tech").slug("nextgen-tech").build();
        reviewerUser = User.builder().id(10L).email("admin@nextgen.com").firstName("Abhay").lastName("Gupta").roles(Set.of(Role.ROLE_COMPANY_ADMIN)).build();
        candidateUser = User.builder().id(20L).email("coder@example.com").firstName("Amit").lastName("Singh").build();

        hrProfile = HrProfile.builder().id(100L).user(reviewerUser).company(company).email("admin@nextgen.com").companyAdmin(true).companyVerified(true).build();

        employee = Employee.builder()
                .id(50L)
                .company(company)
                .user(candidateUser)
                .employeeCode("EMP-001")
                .jobTitle("Software Engineer")
                .department("Engineering")
                .build();
    }

    @Test
    @DisplayName("Should create performance review successfully")
    void createPerformanceReview_Success() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(userRepository.findById(10L)).thenReturn(Optional.of(reviewerUser));
        when(employeeRepository.findById(50L)).thenReturn(Optional.of(employee));

        EmployeePerformanceReview saved = EmployeePerformanceReview.builder()
                .id(1L)
                .company(company)
                .employee(employee)
                .reviewerUser(reviewerUser)
                .reviewPeriod("Q3 2026")
                .rating(new BigDecimal("4.80"))
                .ratingCategory("EXCELLENT")
                .feedback("Outstanding delivery")
                .reviewedAt(Instant.now())
                .build();

        when(performanceRepository.save(any(EmployeePerformanceReview.class))).thenReturn(saved);

        EmployeePerformanceDto.CreateRequest req = EmployeePerformanceDto.CreateRequest.builder()
                .employeeId(50L)
                .reviewPeriod("Q3 2026")
                .rating(new BigDecimal("4.80"))
                .feedback("Outstanding delivery")
                .build();

        EmployeePerformanceDto.Response res = performanceService.createPerformanceReview(10L, req);

        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo(1L);
        assertThat(res.getRatingCategory()).isEqualTo("EXCELLENT");
        assertThat(res.getEmployeeName()).isEqualTo("Amit Singh");
    }

    @Test
    @DisplayName("Should reject review creation if employee belongs to another company")
    void createPerformanceReview_CrossCompany_ThrowsForbidden() {
        Company otherCompany = Company.builder().id(2L).name("Other Corp").build();
        Employee otherEmployee = Employee.builder().id(99L).company(otherCompany).user(candidateUser).build();

        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));
        when(userRepository.findById(10L)).thenReturn(Optional.of(reviewerUser));
        when(employeeRepository.findById(99L)).thenReturn(Optional.of(otherEmployee));

        EmployeePerformanceDto.CreateRequest req = EmployeePerformanceDto.CreateRequest.builder()
                .employeeId(99L)
                .reviewPeriod("Q3 2026")
                .rating(new BigDecimal("4.50"))
                .build();

        assertThatThrownBy(() -> performanceService.createPerformanceReview(10L, req))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Employee does not belong to your company");
    }

    @Test
    @DisplayName("Should list company performance reviews")
    void listCompanyPerformanceReviews_Success() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));

        EmployeePerformanceReview review = EmployeePerformanceReview.builder()
                .id(1L)
                .company(company)
                .employee(employee)
                .reviewerUser(reviewerUser)
                .reviewPeriod("Q3 2026")
                .rating(new BigDecimal("4.50"))
                .ratingCategory("EXCELLENT")
                .reviewedAt(Instant.now())
                .build();

        when(performanceRepository.findByCompanyIdOrderByCreatedAtDesc(1L, PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(review)));

        PagedResponse<EmployeePerformanceDto.Response> response = performanceService.listCompanyPerformanceReviews(10L, PageRequest.of(0, 10));

        assertThat(response).isNotNull();
        assertThat(response.getData()).hasSize(1);
        assertThat(response.getData().get(0).getRating()).isEqualTo(new BigDecimal("4.50"));
    }

    @Test
    @DisplayName("Should return aggregate performance statistics")
    void getPerformanceStats_Success() {
        when(hrProfileRepository.findByUserId(10L)).thenReturn(Optional.of(hrProfile));

        EmployeePerformanceReview r1 = EmployeePerformanceReview.builder().id(1L).company(company).rating(new BigDecimal("4.50")).ratingCategory("EXCELLENT").build();
        EmployeePerformanceReview r2 = EmployeePerformanceReview.builder().id(2L).company(company).rating(new BigDecimal("3.80")).ratingCategory("GOOD").build();

        when(performanceRepository.findByCompanyIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(r1, r2));

        EmployeePerformanceDto.PerformanceStatsResponse stats = performanceService.getPerformanceStats(10L);

        assertThat(stats).isNotNull();
        assertThat(stats.getTotalReviews()).isEqualTo(2);
        assertThat(stats.getExcellentCount()).isEqualTo(1);
        assertThat(stats.getGoodCount()).isEqualTo(1);
        assertThat(stats.getMonthlyTrends()).isNotEmpty();
    }
}
