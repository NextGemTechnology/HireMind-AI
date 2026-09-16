package com.talentiq.service.employee;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.enums.SalaryStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.SalaryDto;
import com.talentiq.dto.notification.NotificationDto;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SalaryServiceImpl implements SalaryService {

    private final SalaryDisbursementRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final com.talentiq.service.company.CompanySecurityService companySecurityService;
    private final UserRepository userRepository;
    private final HrProfileRepository hrProfileRepository;
    private final PaymentProvider paymentProvider;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final MailService mailService;
    private final StringRedisTemplate redisTemplate;

    @Override
    public SalaryDto.Response createSalaryRecord(Long callerUserId, SalaryDto.CreateRequest request) {
        Company company = resolveCompany(callerUserId);
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));

        if (!employee.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Cross-company access violation: Employee does not belong to your company");
        }

        if (employee.getStatus() == EmployeeStatus.TERMINATED || employee.getStatus() == EmployeeStatus.REJECTED) {
            throw new BadRequestException("Cannot create salary records for terminated or rejected employee");
        }

        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);

        SalaryDisbursement salary = SalaryDisbursement.builder()
                .employee(employee)
                .company(company)
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .periodLabel(request.getPeriodLabel().trim())
                .disbursementType(request.getDisbursementType())
                .status(SalaryStatus.DRAFT)
                .submittedBy(callerUser)
                .notes(request.getNotes())
                .build();

        SalaryDisbursement saved = salaryRepository.save(salary);

        auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "user",
                "SALARY_CREATED", "SalaryDisbursement", saved.getId(),
                String.format("{\"amount\":%s,\"currency\":\"%s\",\"period\":\"%s\"}",
                        saved.getAmount(), saved.getCurrency(), saved.getPeriodLabel()), null);

        return mapToResponse(saved);
    }

    @Override
    public SalaryDto.Response submitSalaryForApproval(Long callerUserId, Long salaryId) {
        Company company = resolveCompany(callerUserId);
        SalaryDisbursement salary = findSalaryInCompany(salaryId, company.getId());

        if (salary.getStatus() != SalaryStatus.DRAFT && salary.getStatus() != SalaryStatus.REJECTED) {
            throw new BadRequestException("Only DRAFT or REJECTED records can be submitted. Current: " + salary.getStatus());
        }

        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);
        salary.setStatus(SalaryStatus.PENDING_APPROVAL);
        salary.setSubmittedBy(callerUser);
        salary.setSubmittedAt(Instant.now());

        SalaryDisbursement saved = salaryRepository.save(salary);

        auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "user",
                "SALARY_SUBMITTED", "SalaryDisbursement", saved.getId(), null, null);

        invalidatePendingCache(company.getId());

        return mapToResponse(saved);
    }

    @Override
    public SalaryDto.Response decideSalaryApproval(Long callerUserId, Long salaryId, SalaryDto.ApprovalDecisionRequest request) {
        Company company = resolveCompany(callerUserId);
        SalaryDisbursement salary = findSalaryInCompany(salaryId, company.getId());
        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);

        if (salary.getStatus() != SalaryStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Salary record is not PENDING_APPROVAL. Current: " + salary.getStatus());
        }

        if (request.isApproved()) {
            salary.setStatus(SalaryStatus.APPROVED);
            salary.setApprovedBy(callerUser);
            salary.setApprovedAt(Instant.now());
            salary.setPaymentProvider(paymentProvider.getProviderName());

            // Initiate payment via abstraction provider
            PaymentResult result = paymentProvider.initiateDisbursement(salary);

            if (result.getStatus() == PaymentStatus.SUCCESS) {
                salary.setStatus(SalaryStatus.COMPLETED);
                salary.setPaymentStatus("SUCCESS");
                salary.setTransactionRef(result.getTransactionRef());
                salary.setPaidAt(result.getTimestamp());
            } else {
                salary.setStatus(SalaryStatus.FAILED);
                salary.setPaymentStatus("FAILED");
                salary.setPaymentError(result.getErrorMessage());
            }

            SalaryDisbursement saved = salaryRepository.save(salary);

            auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "company_admin",
                    "SALARY_APPROVED", "SalaryDisbursement", saved.getId(),
                    String.format("{\"status\":\"%s\",\"txnRef\":\"%s\"}", saved.getStatus(), saved.getTransactionRef()), null);

            invalidatePendingCache(company.getId());

            // Notify Employee
            try {
                User empUser = saved.getEmployee().getUser();
                mailService.sendSalaryDisbursementEmail(empUser.getEmail(), empUser.getFirstName(),
                        company.getName(), saved.getAmount().toString(), saved.getCurrency(), saved.getPeriodLabel());
                notificationService.sendNotification(empUser.getId(), NotificationDto.SendRequest.builder()
                        .title("Salary Disbursement Processed 💵")
                        .message(String.format("Your salary disbursement for %s (%s %s) has been processed by %s.",
                                saved.getPeriodLabel(), saved.getCurrency(), saved.getAmount(), company.getName()))
                        .type("SALARY_DISBURSED")
                        .linkUrl("/profile")
                        .build());
            } catch (Exception e) {
                log.warn("Failed to notify employee about salary: {}", e.getMessage());
            }

            return mapToResponse(saved);
        } else {
            salary.setStatus(SalaryStatus.REJECTED);
            salary.setApprovedBy(callerUser);
            salary.setApprovedAt(Instant.now());
            salary.setRejectionReason(request.getRejectionReason());

            SalaryDisbursement saved = salaryRepository.save(salary);

            auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "company_admin",
                    "SALARY_REJECTED", "SalaryDisbursement", saved.getId(),
                    String.format("{\"reason\":\"%s\"}", request.getRejectionReason()), null);

            invalidatePendingCache(company.getId());
            return mapToResponse(saved);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<SalaryDto.Response> listCompanySalaries(Long callerUserId, SalaryStatus status, Pageable pageable) {
        Company company = resolveCompany(callerUserId);
        Page<SalaryDisbursement> page = salaryRepository.findByCompanyIdAndStatus(company.getId(), status, pageable);
        return PagedResponse.of(page.map(SalaryServiceImpl::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SalaryDto.Response> getEmployeeSalaryHistory(Long callerUserId, Long employeeId) {
        Company company = resolveCompany(callerUserId);
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));

        if (!employee.getCompany().getId().equals(company.getId()) && !employee.getUser().getId().equals(callerUserId)) {
            throw new ForbiddenException("Unauthorized to view salary history for this employee");
        }

        List<SalaryDisbursement> list = salaryRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        return list.stream().map(SalaryServiceImpl::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SalaryDto.Response> getCandidateCompletedSalaries(Long candidateUserId) {
        List<SalaryDisbursement> list = salaryRepository.findCompletedByUserId(candidateUserId);
        return list.stream().map(SalaryServiceImpl::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SalaryDto.StatsResponse getSalaryStats(Long callerUserId) {
        Company company = resolveCompany(callerUserId);
        Long cid = company.getId();

        long pendingCount = salaryRepository.countByCompanyIdAndStatus(cid, SalaryStatus.PENDING_APPROVAL);
        long completedCount = salaryRepository.countByCompanyIdAndStatus(cid, SalaryStatus.COMPLETED);

        return SalaryDto.StatsResponse.builder()
                .pendingApprovalsCount(pendingCount)
                .completedDisbursementsCount(completedCount)
                .pendingApprovalsAmount(BigDecimal.ZERO)
                .totalDisbursedThisMonth(BigDecimal.ZERO)
                .build();
    }

    // ── Helper Methods ──

    private Company resolveCompany(Long userId) {
        var managerCompany = companySecurityService.currentManagerCompany(userId);
        if (managerCompany.isPresent()) return managerCompany.get();
        Optional<HrProfile> hrOpt = hrProfileRepository.findByUserId(userId)
                .or(() -> hrProfileRepository.findById(userId));
        if (hrOpt.isPresent() && hrOpt.get().getCompany() != null) {
            HrProfile hr = hrOpt.get();
            if (!hr.isCompanyVerified() && !hr.isCompanyAdmin()) {
                throw new ForbiddenException("Access Denied: HR recruiter is not officially verified by "
                        + hr.getCompany().getName() + ". You must hold an active corporate verification badge to access salary management.");
            }
            return hr.getCompany();
        }

        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            Optional<HrProfile> hrByEmail = hrProfileRepository.findByEmail(auth.getName());
            if (hrByEmail.isPresent() && hrByEmail.get().getCompany() != null) {
                HrProfile hr = hrByEmail.get();
                if (!hr.isCompanyVerified() && !hr.isCompanyAdmin()) {
                    throw new ForbiddenException("Access Denied: HR recruiter is not officially verified by "
                            + hr.getCompany().getName() + ". You must hold an active corporate verification badge to access salary management.");
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

        if (auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_SUPER_ADMIN".equals(a.getAuthority()) || "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()))) {
            return companyRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("No company exists in system"));
        }

        throw new ForbiddenException("Caller is not associated with any corporate workspace");
    }

    private SalaryDisbursement findSalaryInCompany(Long salaryId, Long companyId) {
        SalaryDisbursement salary = salaryRepository.findById(salaryId)
                .orElseThrow(() -> new ResourceNotFoundException("SalaryDisbursement", "id", salaryId));
        if (!salary.getCompany().getId().equals(companyId)) {
            throw new ForbiddenException("Cross-company access violation: Salary record does not belong to your company");
        }
        return salary;
    }

    private void invalidatePendingCache(Long companyId) {
        try {
            redisTemplate.delete("salary:pending:" + companyId);
        } catch (Exception e) {
            log.debug("Redis cache invalidation skipped: {}", e.getMessage());
        }
    }

    public static SalaryDto.Response mapToResponse(SalaryDisbursement s) {
        if (s == null) return null;
        Employee e = s.getEmployee();
        User u = e != null ? e.getUser() : null;
        Company c = s.getCompany();
        User sub = s.getSubmittedBy();
        User app = s.getApprovedBy();

        return SalaryDto.Response.builder()
                .id(s.getId())
                .employeeId(e != null ? e.getId() : null)
                .employeeCode(e != null ? e.getEmployeeCode() : null)
                .employeeName(u != null ? u.getFirstName() + " " + u.getLastName() : null)
                .employeeEmail(u != null ? u.getEmail() : null)
                .companyId(c != null ? c.getId() : null)
                .companyName(c != null ? c.getName() : null)
                .amount(s.getAmount())
                .currency(s.getCurrency())
                .periodLabel(s.getPeriodLabel())
                .disbursementType(s.getDisbursementType())
                .status(s.getStatus())
                .submittedByName(sub != null ? sub.getFirstName() + " " + sub.getLastName() : null)
                .submittedAt(s.getSubmittedAt())
                .approvedByName(app != null ? app.getFirstName() + " " + app.getLastName() : null)
                .approvedAt(s.getApprovedAt())
                .rejectionReason(s.getRejectionReason())
                .paymentProvider(s.getPaymentProvider())
                .transactionRef(s.getTransactionRef())
                .paymentStatus(s.getPaymentStatus())
                .paidAt(s.getPaidAt())
                .paymentError(s.getPaymentError())
                .notes(s.getNotes())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
