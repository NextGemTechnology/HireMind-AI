package com.talentiq.service.employee;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.EmployeeDto;
import com.talentiq.dto.notification.NotificationDto;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeStatusHistoryRepository statusHistoryRepository;
    private final CompanyRepository companyRepository;
    private final com.talentiq.service.company.CompanySecurityService companySecurityService;
    private final UserRepository userRepository;
    private final HrProfileRepository hrProfileRepository;
    private final CompanyCandidateVerificationRepository verificationRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final MailService mailService;
    private final StringRedisTemplate redisTemplate;

    @Override
    public EmployeeDto.Response onboardEmployee(Long callerUserId, EmployeeDto.OnboardRequest request) {
        Company company = resolveCompany(callerUserId);
        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);
        HrProfile hrProfile = hrProfileRepository.findByUserId(callerUserId)
                .or(() -> hrProfileRepository.findById(callerUserId))
                .orElse(null);

        User candidate = userRepository.findById(request.getCandidateUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getCandidateUserId()));

        // Check if already active or pending in this company
        Optional<Employee> existing = employeeRepository.findByCompanyIdAndUserId(company.getId(), candidate.getId());
        if (existing.isPresent()) {
            EmployeeStatus status = existing.get().getStatus();
            if (status == EmployeeStatus.ACTIVE || status == EmployeeStatus.PENDING_VERIFICATION || status == EmployeeStatus.ON_NOTICE) {
                throw new ConflictException("Candidate is already an employee or has a pending onboarding with " + company.getName());
            }
        }

        // Generate employee code if not provided
        String empCode = request.getEmployeeCode();
        if (empCode == null || empCode.isBlank()) {
            long count = employeeRepository.countByCompanyId(company.getId()) + 1;
            empCode = String.format("EMP-%s-%04d", company.getSlug().toUpperCase(), count);
        }

        CompanyCandidateVerification verification = null;
        if (request.getVerificationId() != null) {
            verification = verificationRepository.findById(request.getVerificationId()).orElse(null);
        }

        Employee employee = Employee.builder()
                .company(company)
                .user(candidate)
                .hrProfile(hrProfile)
                .employeeCode(empCode)
                .jobTitle(request.getJobTitle().trim())
                .department(request.getDepartment() != null ? request.getDepartment().trim() : null)
                .employmentType(request.getEmploymentType())
                .status(EmployeeStatus.PENDING_VERIFICATION)
                .joinDate(request.getJoinDate() != null ? request.getJoinDate() : LocalDate.now())
                .baseSalary(request.getBaseSalary())
                .salaryCurrency(request.getSalaryCurrency() != null ? request.getSalaryCurrency() : "INR")
                .salaryPeriod(request.getSalaryPeriod() != null ? request.getSalaryPeriod() : "MONTHLY")
                .verification(verification)
                .build();

        Employee saved = employeeRepository.save(employee);

        // Record history
        recordStatusHistory(saved, null, EmployeeStatus.PENDING_VERIFICATION, callerUser,
                request.getNotes() != null ? request.getNotes() : "Candidate onboarded by HR");

        // Audit log
        auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "system",
                "EMPLOYEE_ONBOARDED", "Employee", saved.getId(),
                String.format("{\"candidateId\":%d,\"companyId\":%d,\"jobTitle\":\"%s\"}",
                        candidate.getId(), company.getId(), saved.getJobTitle()), null);

        // Invalidate Redis cache
        invalidatePendingCache(company.getId());

        // Notifications
        try {
            mailService.sendEmployeeOnboardingEmail(candidate.getEmail(), candidate.getFirstName(),
                    company.getName(), saved.getJobTitle());
            notificationService.sendNotification(candidate.getId(), NotificationDto.SendRequest.builder()
                    .title("Employment Offer: " + company.getName())
                    .message(String.format("You have been onboarded as %s at %s. Verification is pending approval by Company Leadership.",
                            saved.getJobTitle(), company.getName()))
                    .type("EMPLOYMENT_ONBOARDED")
                    .linkUrl("/profile")
                    .build());
        } catch (Exception e) {
            log.warn("Failed to send onboarding notification: {}", e.getMessage());
        }

        return mapToResponse(saved);
    }

    @Override
    public EmployeeDto.Response updateEmployee(Long callerUserId, Long employeeId, EmployeeDto.UpdateRequest request) {
        Company company = resolveCompany(callerUserId);
        Employee employee = findEmployeeInCompany(employeeId, company.getId());

        if (request.getJobTitle() != null && !request.getJobTitle().isBlank()) {
            employee.setJobTitle(request.getJobTitle().trim());
        }
        if (request.getDepartment() != null) {
            employee.setDepartment(request.getDepartment().trim());
        }
        if (request.getEmploymentType() != null) {
            employee.setEmploymentType(request.getEmploymentType());
        }
        if (request.getBaseSalary() != null) {
            employee.setBaseSalary(request.getBaseSalary());
        }
        if (request.getSalaryCurrency() != null) {
            employee.setSalaryCurrency(request.getSalaryCurrency().trim());
        }
        if (request.getSalaryPeriod() != null) {
            employee.setSalaryPeriod(request.getSalaryPeriod().trim());
        }
        if (request.getEmployeeCode() != null && !request.getEmployeeCode().isBlank()) {
            employee.setEmployeeCode(request.getEmployeeCode().trim());
        }

        Employee saved = employeeRepository.save(employee);
        return mapToResponse(saved);
    }

    @Override
    public EmployeeDto.Response verifyEmployee(Long callerUserId, Long employeeId, EmployeeDto.VerificationDecisionRequest request) {
        Company company = resolveCompany(callerUserId);
        Employee employee = findEmployeeInCompany(employeeId, company.getId());
        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);

        if (employee.getStatus() != EmployeeStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Employee is not in PENDING_VERIFICATION state. Current: " + employee.getStatus());
        }

        if (request.isApproved()) {
            employee.setStatus(EmployeeStatus.ACTIVE);
            employee.setVerifiedAt(Instant.now());
            employee.setVerifiedBy(callerUser);
            if (request.getEmployeeCode() != null && !request.getEmployeeCode().isBlank()) {
                employee.setEmployeeCode(request.getEmployeeCode().trim());
            }

            Employee saved = employeeRepository.save(employee);

            recordStatusHistory(saved, EmployeeStatus.PENDING_VERIFICATION, EmployeeStatus.ACTIVE, callerUser,
                    "Verified and approved by Company Leadership");

            auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "company_admin",
                    "EMPLOYEE_VERIFIED", "Employee", saved.getId(),
                    String.format("{\"employeeId\":%d,\"status\":\"ACTIVE\"}", saved.getId()), null);

            invalidatePendingCache(company.getId());

            try {
                User candidate = saved.getUser();
                mailService.sendEmployeeVerifiedEmail(candidate.getEmail(), candidate.getFirstName(),
                        company.getName(), saved.getJobTitle(), saved.getEmployeeCode());
                notificationService.sendNotification(candidate.getId(), NotificationDto.SendRequest.builder()
                        .title("Official Employment Verified! 🎉")
                        .message(String.format("Your employment as %s at %s has been officially verified! Employee Code: %s",
                                saved.getJobTitle(), company.getName(), saved.getEmployeeCode()))
                        .type("EMPLOYMENT_VERIFIED")
                        .linkUrl("/profile")
                        .build());
            } catch (Exception e) {
                log.warn("Failed to dispatch verified email: {}", e.getMessage());
            }

            return mapToResponse(saved);
        } else {
            employee.setStatus(EmployeeStatus.REJECTED);
            employee.setRejectionReason(request.getRejectionReason());

            Employee saved = employeeRepository.save(employee);

            recordStatusHistory(saved, EmployeeStatus.PENDING_VERIFICATION, EmployeeStatus.REJECTED, callerUser,
                    "Rejected by Company Leadership: " + request.getRejectionReason());

            auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "company_admin",
                    "EMPLOYEE_REJECTED", "Employee", saved.getId(),
                    String.format("{\"reason\":\"%s\"}", request.getRejectionReason()), null);

            invalidatePendingCache(company.getId());
            return mapToResponse(saved);
        }
    }

    @Override
    public EmployeeDto.Response requestTermination(Long callerUserId, Long employeeId, EmployeeDto.TerminationRequest request) {
        Company company = resolveCompany(callerUserId);
        Employee employee = findEmployeeInCompany(employeeId, company.getId());
        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);

        if (employee.getStatus() != EmployeeStatus.ACTIVE && employee.getStatus() != EmployeeStatus.SUSPENDED) {
            throw new BadRequestException("Only ACTIVE or SUSPENDED employees can be terminated. Current: " + employee.getStatus());
        }

        EmployeeStatus prevStatus = employee.getStatus();
        employee.setStatus(EmployeeStatus.ON_NOTICE);
        employee.setTerminationStatus("PENDING_APPROVAL");
        employee.setTerminationReason(request.getReason());
        employee.setNoticePeriodDays(request.getNoticePeriodDays() != null ? request.getNoticePeriodDays() : 30);
        employee.setLastWorkingDate(request.getLastWorkingDate() != null ? request.getLastWorkingDate() : LocalDate.now().plusDays(employee.getNoticePeriodDays()));

        Employee saved = employeeRepository.save(employee);

        recordStatusHistory(saved, prevStatus, EmployeeStatus.ON_NOTICE, callerUser,
                "Termination requested: " + request.getReason());

        auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "hr",
                "TERMINATION_REQUESTED", "Employee", saved.getId(),
                String.format("{\"reason\":\"%s\",\"noticeDays\":%d}", request.getReason(), employee.getNoticePeriodDays()), null);

        invalidatePendingCache(company.getId());

        try {
            notificationService.sendNotification(saved.getUser().getId(), NotificationDto.SendRequest.builder()
                    .title("Notice of Employment Status Review")
                    .message(String.format("A termination transition has been submitted for your position at %s. Notice period: %d days.",
                            company.getName(), employee.getNoticePeriodDays()))
                    .type("TERMINATION_REQUESTED")
                    .linkUrl("/profile")
                    .build());
        } catch (Exception e) {
            log.warn("Failed to notify candidate about termination request: {}", e.getMessage());
        }

        return mapToResponse(saved);
    }

    @Override
    public EmployeeDto.Response decideTermination(Long callerUserId, Long employeeId, EmployeeDto.TerminationDecisionRequest request) {
        Company company = resolveCompany(callerUserId);
        Employee employee = findEmployeeInCompany(employeeId, company.getId());
        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);

        if (employee.getStatus() != EmployeeStatus.ON_NOTICE) {
            throw new BadRequestException("Employee is not ON_NOTICE. Current: " + employee.getStatus());
        }

        if (request.isApproved()) {
            employee.setStatus(EmployeeStatus.TERMINATED);
            employee.setTerminationStatus("APPROVED");
            employee.setTerminatedAt(Instant.now());
            employee.setTerminatedBy(callerUser);

            Employee saved = employeeRepository.save(employee);

            recordStatusHistory(saved, EmployeeStatus.ON_NOTICE, EmployeeStatus.TERMINATED, callerUser,
                    "Termination approved: " + (request.getNotes() != null ? request.getNotes() : "Confirmed by Company Leadership"));

            auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "company_admin",
                    "TERMINATION_APPROVED", "Employee", saved.getId(),
                    String.format("{\"terminatedAt\":\"%s\"}", saved.getTerminatedAt()), null);

            invalidatePendingCache(company.getId());

            try {
                User candidate = saved.getUser();
                mailService.sendTerminationNoticeEmail(candidate.getEmail(), candidate.getFirstName(),
                        company.getName(), saved.getTerminationReason(),
                        saved.getLastWorkingDate() != null ? saved.getLastWorkingDate().toString() : "Immediate");
                notificationService.sendNotification(candidate.getId(), NotificationDto.SendRequest.builder()
                        .title("Employment Concluded — " + company.getName())
                        .message("Your employment separation has been officially finalized. We thank you for your contributions.")
                        .type("TERMINATION_APPROVED")
                        .linkUrl("/profile")
                        .build());
            } catch (Exception e) {
                log.warn("Failed to dispatch termination confirmation: {}", e.getMessage());
            }

            return mapToResponse(saved);
        } else {
            employee.setStatus(EmployeeStatus.ACTIVE);
            employee.setTerminationStatus("REJECTED");

            Employee saved = employeeRepository.save(employee);

            recordStatusHistory(saved, EmployeeStatus.ON_NOTICE, EmployeeStatus.ACTIVE, callerUser,
                    "Termination rejected: " + (request.getNotes() != null ? request.getNotes() : "Restored to active status by Company Leadership"));

            auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "company_admin",
                    "TERMINATION_REJECTED", "Employee", saved.getId(), null, null);

            invalidatePendingCache(company.getId());
            return mapToResponse(saved);
        }
    }

    @Override
    public EmployeeDto.Response suspendEmployee(Long callerUserId, Long employeeId, EmployeeDto.SuspendRequest request) {
        Company company = resolveCompany(callerUserId);
        Employee employee = findEmployeeInCompany(employeeId, company.getId());
        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new BadRequestException("Only ACTIVE employees can be suspended. Current: " + employee.getStatus());
        }

        employee.setStatus(EmployeeStatus.SUSPENDED);
        Employee saved = employeeRepository.save(employee);

        recordStatusHistory(saved, EmployeeStatus.ACTIVE, EmployeeStatus.SUSPENDED, callerUser,
                "Suspended: " + request.getReason());

        auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "admin",
                "EMPLOYEE_SUSPENDED", "Employee", saved.getId(),
                String.format("{\"reason\":\"%s\"}", request.getReason()), null);

        return mapToResponse(saved);
    }

    @Override
    public EmployeeDto.Response reinstateEmployee(Long callerUserId, Long employeeId) {
        Company company = resolveCompany(callerUserId);
        Employee employee = findEmployeeInCompany(employeeId, company.getId());
        User callerUser = userRepository.findById(companySecurityService.currentManagerActorId(callerUserId).orElse(callerUserId)).orElse(null);

        if (employee.getStatus() != EmployeeStatus.SUSPENDED) {
            throw new BadRequestException("Only SUSPENDED employees can be reinstated. Current: " + employee.getStatus());
        }

        employee.setStatus(EmployeeStatus.ACTIVE);
        Employee saved = employeeRepository.save(employee);

        recordStatusHistory(saved, EmployeeStatus.SUSPENDED, EmployeeStatus.ACTIVE, callerUser,
                "Reinstated to active status");

        auditLogService.recordSuccess(callerUserId, callerUser != null ? callerUser.getEmail() : "admin",
                "EMPLOYEE_REINSTATED", "Employee", saved.getId(), null, null);

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeDto.Response getEmployeeById(Long callerUserId, Long employeeId) {
        Company company = resolveCompany(callerUserId);
        Employee employee = findEmployeeInCompany(employeeId, company.getId());
        EmployeeDto.Response response = mapToResponse(employee);

        List<EmployeeStatusHistory> history = statusHistoryRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        response.setStatusHistory(history.stream().map(EmployeeServiceImpl::mapStatusHistory).collect(Collectors.toList()));

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<EmployeeDto.Response> listCompanyEmployees(Long callerUserId, EmployeeStatus status, Pageable pageable) {
        Company company = resolveCompany(callerUserId);
        Page<Employee> page = employeeRepository.findByCompanyIdAndStatus(company.getId(), status, pageable);
        return PagedResponse.of(page.map(EmployeeServiceImpl::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeDto.Response> getCandidateEmployments(Long candidateUserId) {
        List<Employee> employments = employeeRepository.findByUserId(candidateUserId);
        return employments.stream().map(EmployeeServiceImpl::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeDto.DashboardStatsResponse getCompanyDashboardStats(Long callerUserId) {
        Company company = resolveCompany(callerUserId);
        Long cid = company.getId();

        return EmployeeDto.DashboardStatsResponse.builder()
                .totalEmployees(employeeRepository.countByCompanyId(cid))
                .activeEmployees(employeeRepository.countByCompanyIdAndStatus(cid, EmployeeStatus.ACTIVE))
                .pendingVerifications(employeeRepository.countByCompanyIdAndStatus(cid, EmployeeStatus.PENDING_VERIFICATION))
                .onNoticeEmployees(employeeRepository.countByCompanyIdAndStatus(cid, EmployeeStatus.ON_NOTICE))
                .terminatedEmployees(employeeRepository.countByCompanyIdAndStatus(cid, EmployeeStatus.TERMINATED))
                .pendingTerminations(employeeRepository.countPendingTerminationsByCompanyId(cid))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeDto.StatusHistoryResponse> getEmployeeStatusHistory(Long callerUserId, Long employeeId) {
        Company company = resolveCompany(callerUserId);
        findEmployeeInCompany(employeeId, company.getId()); // Enforces company boundary
        List<EmployeeStatusHistory> history = statusHistoryRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        return history.stream().map(EmployeeServiceImpl::mapStatusHistory).collect(Collectors.toList());
    }

    // ── Helper Methods ──

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<EmployeeDto.Response> searchCompanyEmployees(Long callerUserId, EmployeeStatus status, String terminationStatus, String search, Pageable pageable) {
        Company company = resolveCompany(callerUserId);
        return PagedResponse.of(employeeRepository.searchCompanyEmployees(company.getId(), status, terminationStatus,
                search == null ? "" : search.trim(), pageable).map(EmployeeServiceImpl::mapToResponse));
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
                        + hr.getCompany().getName() + ". You must hold an active corporate verification badge to access employee lifecycle features.");
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
                            + hr.getCompany().getName() + ". You must hold an active corporate verification badge to access employee lifecycle features.");
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

        // 3. Platform Admin bypass check
        if (auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_SUPER_ADMIN".equals(a.getAuthority()) || "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()))) {
            return companyRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("No company exists in system"));
        }

        throw new ForbiddenException("Caller is not associated with any corporate workspace");
    }

    private Employee findEmployeeInCompany(Long employeeId, Long companyId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        if (!employee.getCompany().getId().equals(companyId)) {
            throw new ForbiddenException("Cross-company access violation: Employee does not belong to your company");
        }
        return employee;
    }

    private void recordStatusHistory(Employee employee, EmployeeStatus from, EmployeeStatus to, User changedBy, String notes) {
        EmployeeStatusHistory history = EmployeeStatusHistory.builder()
                .employee(employee)
                .fromStatus(from)
                .toStatus(to)
                .changedBy(changedBy)
                .notes(notes)
                .build();
        statusHistoryRepository.save(history);
    }

    private void invalidatePendingCache(Long companyId) {
        try {
            redisTemplate.delete("employee:pending:" + companyId);
            redisTemplate.delete("salary:pending:" + companyId);
        } catch (Exception e) {
            log.debug("Redis cache invalidation skipped: {}", e.getMessage());
        }
    }

    public static EmployeeDto.Response mapToResponse(Employee e) {
        if (e == null) return null;
        User u = e.getUser();
        Company c = e.getCompany();
        HrProfile h = e.getHrProfile();

        String badgeCert = e.getVerification() != null ? e.getVerification().getBadgeCertificateId() : null;

        return EmployeeDto.Response.builder()
                .id(e.getId())
                .companyId(c != null ? c.getId() : null)
                .companyName(c != null ? c.getName() : null)
                .companyLogoUrl(c != null ? c.getLogoUrl() : null)
                .userId(u != null ? u.getId() : null)
                .candidateName(u != null ? u.getFirstName() + " " + u.getLastName() : null)
                .candidateEmail(u != null ? u.getEmail() : null)
                .candidateAvatarUrl(u != null ? u.getAvatarUrl() : null)
                .hrProfileId(h != null ? h.getId() : null)
                .hrName(h != null ? h.getFirstName() + " " + h.getLastName() : null)
                .employeeCode(e.getEmployeeCode())
                .jobTitle(e.getJobTitle())
                .department(e.getDepartment())
                .employmentType(e.getEmploymentType())
                .status(e.getStatus())
                .joinDate(e.getJoinDate())
                .verifiedAt(e.getVerifiedAt())
                .verifiedByName(e.getVerifiedBy() != null ? e.getVerifiedBy().getFirstName() + " " + e.getVerifiedBy().getLastName() : null)
                .rejectionReason(e.getRejectionReason())
                .terminationStatus(e.getTerminationStatus())
                .terminationReason(e.getTerminationReason())
                .noticePeriodDays(e.getNoticePeriodDays())
                .lastWorkingDate(e.getLastWorkingDate())
                .terminatedAt(e.getTerminatedAt())
                .terminatedByName(e.getTerminatedBy() != null ? e.getTerminatedBy().getFirstName() + " " + e.getTerminatedBy().getLastName() : null)
                .baseSalary(e.getBaseSalary())
                .salaryCurrency(e.getSalaryCurrency())
                .salaryPeriod(e.getSalaryPeriod())
                .badgeCertificateId(badgeCert)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    public static EmployeeDto.StatusHistoryResponse mapStatusHistory(EmployeeStatusHistory h) {
        if (h == null) return null;
        User cb = h.getChangedBy();
        return EmployeeDto.StatusHistoryResponse.builder()
                .id(h.getId())
                .fromStatus(h.getFromStatus())
                .toStatus(h.getToStatus())
                .changedByName(cb != null ? cb.getFirstName() + " " + cb.getLastName() : "System")
                .notes(h.getNotes())
                .createdAt(h.getCreatedAt())
                .build();
    }
}
