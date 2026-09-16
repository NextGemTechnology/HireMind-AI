package com.talentiq.service.employee;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeePerformanceServiceImpl implements EmployeePerformanceService {

    private final com.talentiq.service.company.CompanySecurityService companySecurityService;
    private final EmployeePerformanceRepository performanceRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final HrProfileRepository hrProfileRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public EmployeePerformanceDto.Response createPerformanceReview(Long reviewerUserId, EmployeePerformanceDto.CreateRequest request) {
        Company company = resolveCompany(reviewerUserId);
        User reviewer = userRepository.findById(companySecurityService.currentManagerActorId(reviewerUserId).orElse(reviewerUserId))
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer user not found with id: " + reviewerUserId));

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + request.getEmployeeId()));

        if (!employee.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Employee does not belong to your company");
        }

        String category = request.getRatingCategory();
        if (category == null || category.isBlank()) {
            BigDecimal r = request.getRating();
            if (r.compareTo(new BigDecimal("4.50")) >= 0) category = "EXCELLENT";
            else if (r.compareTo(new BigDecimal("3.50")) >= 0) category = "GOOD";
            else if (r.compareTo(new BigDecimal("2.50")) >= 0) category = "AVERAGE";
            else category = "NEEDS_IMPROVEMENT";
        }

        EmployeePerformanceReview review = EmployeePerformanceReview.builder()
                .company(company)
                .employee(employee)
                .reviewerUser(reviewer)
                .reviewPeriod(request.getReviewPeriod())
                .rating(request.getRating())
                .ratingCategory(category)
                .feedback(request.getFeedback())
                .goalsOkrs(request.getGoalsOkrs())
                .reviewedAt(Instant.now())
                .build();

        EmployeePerformanceReview saved = performanceRepository.save(review);
        log.info("Performance review created for employee id {} by reviewer id {}", employee.getId(), reviewerUserId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<EmployeePerformanceDto.Response> listCompanyPerformanceReviews(Long reviewerUserId, Pageable pageable) {
        Company company = resolveCompany(reviewerUserId);
        Page<EmployeePerformanceReview> page = performanceRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId(), pageable);
        return PagedResponse.of(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeePerformanceDto.PerformanceStatsResponse getPerformanceStats(Long reviewerUserId) {
        Company company = resolveCompany(reviewerUserId);
        var groups = performanceRepository.summarizeRatings(company.getId());
        long total = 0, excellent = 0, good = 0, average = 0, needs = 0;
        double sum = 0;
        for (Object[] row : groups) {
            long count = ((Number) row[1]).longValue();
            total += count;
            sum += ((Number) row[2]).doubleValue();
            switch (String.valueOf(row[0]).toUpperCase(java.util.Locale.ROOT)) {
                case "EXCELLENT" -> excellent += count;
                case "GOOD" -> good += count;
                case "AVERAGE" -> average += count;
                default -> needs += count;
            }
        }
        var departments = performanceRepository.summarizeDepartments(company.getId()).stream()
                .map(row -> new EmployeePerformanceDto.DepartmentRatingItem((String) row[0],
                        Math.round(((Number) row[1]).doubleValue() * 100.0) / 100.0,
                        ((Number) row[2]).longValue())).toList();
        var since = java.time.LocalDate.now(java.time.ZoneOffset.UTC).withDayOfMonth(1).minusMonths(11)
                .atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        var months = performanceRepository.summarizeMonths(company.getId(), since).stream()
                .map(row -> new EmployeePerformanceDto.MonthlyTrendItem((String) row[0],
                        ((Number) row[1]).intValue(), ((Number) row[2]).intValue(),
                        ((Number) row[3]).intValue(), ((Number) row[4]).intValue())).toList();
        return EmployeePerformanceDto.PerformanceStatsResponse.builder()
                .totalReviews(total).averageRating(total == 0 ? 0 : Math.round(sum / total * 100.0) / 100.0)
                .excellentCount(excellent).goodCount(good).averageCount(average).needsImprovementCount(needs)
                .departmentRatings(departments).monthlyTrends(months).build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeePerformanceDto.Response> getEmployeeReviews(Long reviewerUserId, Long employeeId) {
        Company company = resolveCompany(reviewerUserId);
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        if (!employee.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Employee does not belong to your company");
        }

        return performanceRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private EmployeePerformanceDto.Response mapToResponse(EmployeePerformanceReview r) {
        String empName = r.getEmployee() != null && r.getEmployee().getUser() != null
                ? r.getEmployee().getUser().getFullName() : "Employee";
        String empEmail = r.getEmployee() != null && r.getEmployee().getUser() != null
                ? r.getEmployee().getUser().getEmail() : "";
        String revName = r.getReviewerUser() != null ? r.getReviewerUser().getFullName() : "Executive";

        return EmployeePerformanceDto.Response.builder()
                .id(r.getId())
                .companyId(r.getCompany().getId())
                .employeeId(r.getEmployee().getId())
                .employeeName(empName)
                .employeeEmail(empEmail)
                .employeeCode(r.getEmployee().getEmployeeCode())
                .jobTitle(r.getEmployee().getJobTitle())
                .department(r.getEmployee().getDepartment())
                .reviewerUserId(r.getReviewerUser().getId())
                .reviewerName(revName)
                .reviewPeriod(r.getReviewPeriod())
                .rating(r.getRating())
                .ratingCategory(r.getRatingCategory())
                .feedback(r.getFeedback())
                .goalsOkrs(r.getGoalsOkrs())
                .reviewedAt(r.getReviewedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private Company resolveCompany(Long userId) {
        var managerCompany = companySecurityService.currentManagerCompany(userId);
        if (managerCompany.isPresent()) return managerCompany.get();
        // 1. Check HR Profile
        Optional<HrProfile> hrOpt = hrProfileRepository.findByUserId(userId)
                .or(() -> hrProfileRepository.findById(userId));
        if (hrOpt.isPresent() && hrOpt.get().getCompany() != null) {
            HrProfile hr = hrOpt.get();
            if (!hr.isCompanyVerified() && !hr.isCompanyAdmin()) {
                throw new ForbiddenException("Access Denied: HR recruiter is not officially verified by "
                        + hr.getCompany().getName());
            }
            return hr.getCompany();
        }

        // 2. Check by email via SecurityContext
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            Optional<HrProfile> hrByEmail = hrProfileRepository.findByEmail(auth.getName());
            if (hrByEmail.isPresent() && hrByEmail.get().getCompany() != null) {
                HrProfile hr = hrByEmail.get();
                if (!hr.isCompanyVerified() && !hr.isCompanyAdmin()) {
                    throw new ForbiddenException("Access Denied: HR recruiter is not officially verified by "
                            + hr.getCompany().getName());
                }
                return hr.getCompany();
            }

            Optional<Company> compByEmail = companyRepository.findAll().stream()
                    .filter(c -> auth.getName().equalsIgnoreCase(c.getEmail()))
                    .findFirst();
            if (compByEmail.isPresent()) {
                return compByEmail.get();
            }
        }

        // 3. Registered by user
        return companyRepository.findByRegisteredByUserId(userId)
                .orElseThrow(() -> new ForbiddenException("No authorized company found for user id " + userId));
    }
}
