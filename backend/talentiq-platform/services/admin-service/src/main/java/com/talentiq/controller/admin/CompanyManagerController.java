package com.talentiq.controller.admin;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.company.CompanyInvitationDto;
import com.talentiq.model.Company;
import com.talentiq.model.CompanyTask;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.company.CompanyTaskRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.company.CompanyInvitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.talentiq.common.enums.SalaryStatus;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.EmployeePerformanceDto;
import com.talentiq.repository.company.CompanyCandidateVerificationRepository;
import com.talentiq.repository.employee.EmployeeRepository;
import com.talentiq.repository.employee.SalaryDisbursementRepository;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.service.employee.EmployeePerformanceService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/admin/company")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
@Tag(name = "Company Manager SaaS Workspace", description = "Multi-tenant corporate workspace, HR roster, tasks, and executive overview")
public class CompanyManagerController {

    private final com.talentiq.service.company.CompanySecurityService companySecurityService;
    private final CompanyRepository companyRepository;
    private final HrProfileRepository hrProfileRepository;
    private final CompanyTaskRepository companyTaskRepository;
    private final CompanyInvitationService companyInvitationService;
    private final EmployeeRepository employeeRepository;
    private final JobRepository jobRepository;
    private final SalaryDisbursementRepository salaryDisbursementRepository;
    private final CompanyCandidateVerificationRepository candidateVerificationRepository;
    private final EmployeePerformanceService employeePerformanceService;

    @GetMapping("/dashboard")
    @Operation(summary = "Get Company Executive / Manager today workspace metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCompanyDashboard(
            @AuthenticationPrincipal UserPrincipal principal) {

        Company company = resolveAuthenticatedCompany(principal);
        Long companyId = company.getId();

        long pendingVerifications = candidateVerificationRepository.countByCompanyIdAndStatus(companyId, "PENDING");
        long pendingSalaries = salaryDisbursementRepository.countByCompanyIdAndStatus(companyId, SalaryStatus.PENDING_APPROVAL);
        long pendingOnboarding = employeeRepository.countByCompanyIdAndStatus(companyId, com.talentiq.common.enums.EmployeeStatus.PENDING_VERIFICATION);
        long pendingTerminations = employeeRepository.countPendingTerminationsByCompanyId(companyId);

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("companyId", companyId);
        dashboard.put("companyName", company.getName());
        dashboard.put("companySlug", company.getSlug());
        dashboard.put("tagline", company.getTagline());
        dashboard.put("industry", company.getIndustry());
        dashboard.put("companySize", company.getCompanySize());
        dashboard.put("foundedYear", company.getFoundedYear());
        dashboard.put("website", company.getWebsite());
        dashboard.put("location", company.getLocation());
        dashboard.put("email", company.getEmail());
        dashboard.put("phone", company.getPhone());
        dashboard.put("description", company.getDescription());
        dashboard.put("logoUrl", company.getLogoUrl());
        dashboard.put("bannerUrl", company.getBannerUrl());
        dashboard.put("isVerified", company.isVerified());
        dashboard.put("totalEmployees", employeeRepository.countByCompanyId(companyId));
        dashboard.put("activeEmployees", employeeRepository.countByCompanyIdAndStatus(companyId, com.talentiq.common.enums.EmployeeStatus.ACTIVE));
        dashboard.put("totalHrMembers", hrProfileRepository.countByCompanyId(companyId));
        dashboard.put("verifiedHrMembers", hrProfileRepository.countByCompanyIdAndCompanyVerifiedTrue(companyId));
        dashboard.put("activeJobsCount", jobRepository.countByCompanyIdAndStatus(companyId, com.talentiq.common.enums.JobStatus.ACTIVE));
        dashboard.put("pendingApprovalsCount", pendingVerifications + pendingSalaries + pendingOnboarding + pendingTerminations);
        dashboard.put("pendingVerifications", pendingVerifications);
        dashboard.put("pendingSalaries", pendingSalaries);
        dashboard.put("pendingOnboarding", pendingOnboarding);
        dashboard.put("pendingTerminations", pendingTerminations);
        dashboard.put("totalTasks", companyTaskRepository.countTotalByCompanyId(companyId));
        dashboard.put("completedTasks", companyTaskRepository.countCompletedByCompanyId(companyId));

        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }

    @GetMapping("/team/hrs")
    @Operation(summary = "List all HR recruiters belonging to this company")
    public ResponseEntity<ApiResponse<List<RecruiterSummary>>> getCompanyHrTeam(
            @AuthenticationPrincipal UserPrincipal principal) {
        Company company = resolveAuthenticatedCompany(principal);
        List<HrProfile> team = hrProfileRepository.findAllByCompanyId(company.getId());
        return ResponseEntity.ok(ApiResponse.success(team.stream().map(RecruiterSummary::from).toList()));
    }

    @GetMapping("/tasks")
    @Operation(summary = "List corporate tasks and milestones for this company")
    public ResponseEntity<ApiResponse<List<CompanyTask>>> getCompanyTasks(
            @AuthenticationPrincipal UserPrincipal principal) {
        Company company = resolveAuthenticatedCompany(principal);
        List<CompanyTask> tasks = companyTaskRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    // ── Corporate Onboarding & Invitations ──

    @PostMapping("/invitations")
    @Operation(summary = "Send corporate invitation to HR recruiter or Candidate")
    public ResponseEntity<ApiResponse<CompanyInvitationDto.Response>> createInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompanyInvitationDto.CreateRequest request) {
        CompanyInvitationDto.Response response = companyInvitationService.createInvitation(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Invitation generated and sent successfully", response));
    }

    @GetMapping("/invitations")
    @Operation(summary = "List all corporate invitations sent by this company")
    public ResponseEntity<ApiResponse<List<CompanyInvitationDto.Response>>> listInvitations(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<CompanyInvitationDto.Response> list = companyInvitationService.listCompanyInvitations(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/invitations/{id}/resend")
    @Operation(summary = "Resend an invitation email with renewed expiry")
    public ResponseEntity<ApiResponse<CompanyInvitationDto.Response>> resendInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        CompanyInvitationDto.Response response = companyInvitationService.resendInvitation(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Invitation resent successfully", response));
    }

    @DeleteMapping("/invitations/{id}")
    @Operation(summary = "Revoke an active invitation")
    public ResponseEntity<ApiResponse<Void>> revokeInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        companyInvitationService.revokeInvitation(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Invitation revoked successfully", null));
    }

    @PostMapping("/team/direct-hr")
    @Operation(summary = "Fast-track directly affiliate an HR recruiter to this company")
    public ResponseEntity<ApiResponse<CompanyInvitationDto.Response>> directAffiliateHr(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompanyInvitationDto.DirectAffiliateHrRequest request) {
        CompanyInvitationDto.Response response = companyInvitationService.directAffiliateHr(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("HR recruiter successfully affiliated with company", response));
    }

    @PostMapping("/candidates/direct-invite")
    @Operation(summary = "Directly invite a candidate to the company talent pipeline")
    public ResponseEntity<ApiResponse<CompanyInvitationDto.Response>> directInviteCandidate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompanyInvitationDto.DirectCandidateInviteRequest request) {
        CompanyInvitationDto.Response response = companyInvitationService.directInviteCandidate(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Candidate invitation dispatched successfully", response));
    }

    @PutMapping("/hrs/{hrId}/badge")
    @Operation(summary = "Issue or revoke verified HR badge for a company recruiter")
    public ResponseEntity<ApiResponse<CompanyInvitationDto.Response>> verifyOrRevokeHrBadge(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long hrId,
            @RequestBody CompanyInvitationDto.VerifyHrBadgeRequest request) {
        CompanyInvitationDto.Response response = companyInvitationService.verifyOrRevokeHrBadge(principal.getId(), hrId, request);
        return ResponseEntity.ok(ApiResponse.success("HR verification badge updated", response));
    }

    @GetMapping("/candidates/pool")
    @Operation(summary = "Discover candidates in the platform pool to directly invite")
    public ResponseEntity<?> getCandidatePool(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "") String search) {
        // Keep the original unpaged response available; new manager searches are database-paged.
        if (page == null) {
            return ResponseEntity.ok(ApiResponse.success(companyInvitationService.getCandidatePool(principal.getId())
                    .stream().map(CandidateSummary::from).toList()));
        }
        var candidates = companyInvitationService.searchCandidatePool(principal.getId(), search,
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)), Sort.by("firstName", "id")));
        return ResponseEntity.ok(PagedResponse.of(candidates.map(CandidateSummary::from)));
    }

    // ── Employee Performance & Feedback ──

    @GetMapping("/performance")
    @Operation(summary = "List employee performance reviews for this company")
    public ResponseEntity<PagedResponse<EmployeePerformanceDto.Response>> listPerformanceReviews(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)), Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return ResponseEntity.ok(employeePerformanceService.listCompanyPerformanceReviews(principal.getId(), pageable));
    }

    @PostMapping("/performance")
    @Operation(summary = "Submit a new employee performance review")
    public ResponseEntity<ApiResponse<EmployeePerformanceDto.Response>> createPerformanceReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody EmployeePerformanceDto.CreateRequest request) {
        EmployeePerformanceDto.Response res = employeePerformanceService.createPerformanceReview(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Performance review submitted successfully", res));
    }

    @GetMapping("/performance/stats")
    @Operation(summary = "Get employee performance aggregate statistics and monthly rating trends")
    public ResponseEntity<ApiResponse<EmployeePerformanceDto.PerformanceStatsResponse>> getPerformanceStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(employeePerformanceService.getPerformanceStats(principal.getId())));
    }

    // ── Executive Reports & Analytics ──

    @GetMapping("/analytics")
    @Operation(summary = "Get comprehensive corporate hiring, workforce, and payroll telemetry")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCompanyAnalytics(
            @AuthenticationPrincipal UserPrincipal principal) {
        Company company = resolveAuthenticatedCompany(principal);
        Long companyId = company.getId();

        long totalEmployees = employeeRepository.countByCompanyId(companyId);
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("companyId", companyId);
        metrics.put("companyName", company.getName());
        metrics.put("totalHires", totalEmployees);
        metrics.put("activeEmployees", employeeRepository.countByCompanyIdAndStatus(companyId, com.talentiq.common.enums.EmployeeStatus.ACTIVE));
        metrics.put("activeJobsCount", jobRepository.countByCompanyIdAndStatus(companyId, com.talentiq.common.enums.JobStatus.ACTIVE));
        metrics.put("hiringByDepartment", employeeRepository.countByDepartment(companyId).stream().map(row ->
                Map.of("department", row[0], "hires", row[1],
                        "percentage", totalEmployees == 0 ? 0 : Math.round(((Number) row[1]).doubleValue() * 100 / totalEmployees))).toList());
        metrics.put("employeeStatuses", employeeRepository.countByEmployeeStatus(companyId).stream().map(row ->
                Map.of("status", row[0], "count", row[1])).toList());
        var since = java.time.LocalDate.now(java.time.ZoneOffset.UTC).withDayOfMonth(1).minusMonths(11)
                .atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        metrics.put("monthlyStats", employeeRepository.monthlyOnboarding(companyId, since).stream().map(row ->
                Map.of("month", row[0], "hired", row[1])).toList());
        // Never mix currencies, and do not mistake unpaid amounts for completed payroll.
        metrics.put("payrollByCurrency", salaryDisbursementRepository.summarizeByCurrencyAndStatus(companyId).stream().map(row ->
                Map.of("currency", row[0], "status", row[1], "count", row[2], "amount", row[3])).toList());

        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    // ── Company Profile Update ──

    @PutMapping("/profile")
    @Operation(summary = "Update corporate profile information and branding")
    public ResponseEntity<ApiResponse<Company>> updateCompanyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> updates) {
        Company company = resolveAuthenticatedCompany(principal);

        Map<String, Integer> limits = Map.of("name", 200, "tagline", 255, "industry", 100,
                "companySize", 30, "website", 500, "location", 200, "phone", 20,
                "description", 10000, "logoUrl", 500, "bannerUrl", 500);
        for (var limit : limits.entrySet()) {
            Object value = updates.get(limit.getKey());
            if (value != null && (!(value instanceof String) || ((String) value).trim().length() > limit.getValue()))
                throw new com.talentiq.common.exception.BadRequestException("Invalid " + limit.getKey());
        }
        if (updates.containsKey("name") && (!(updates.get("name") instanceof String name) || name.isBlank()))
            throw new com.talentiq.common.exception.BadRequestException("Company name is required");

        if (updates.containsKey("name") && updates.get("name") != null) {
            company.setName(updates.get("name").toString().trim());
        }
        if (updates.containsKey("tagline")) {
            company.setTagline(updates.get("tagline") != null ? updates.get("tagline").toString().trim() : null);
        }
        if (updates.containsKey("industry")) {
            company.setIndustry(updates.get("industry") != null ? updates.get("industry").toString().trim() : null);
        }
        if (updates.containsKey("companySize")) {
            company.setCompanySize(updates.get("companySize") != null ? updates.get("companySize").toString().trim() : null);
        }
        if (updates.containsKey("website")) {
            company.setWebsite(updates.get("website") != null ? updates.get("website").toString().trim() : null);
        }
        if (updates.containsKey("location")) {
            company.setLocation(updates.get("location") != null ? updates.get("location").toString().trim() : null);
        }
        if (updates.containsKey("phone")) {
            company.setPhone(updates.get("phone") != null ? updates.get("phone").toString().trim() : null);
        }
        if (updates.containsKey("description")) {
            company.setDescription(updates.get("description") != null ? updates.get("description").toString().trim() : null);
        }
        if (updates.containsKey("logoUrl")) {
            company.setLogoUrl(updates.get("logoUrl") != null ? updates.get("logoUrl").toString().trim() : null);
        }
        if (updates.containsKey("bannerUrl")) {
            company.setBannerUrl(updates.get("bannerUrl") != null ? updates.get("bannerUrl").toString().trim() : null);
        }

        Company saved = companyRepository.save(company);
        return ResponseEntity.ok(ApiResponse.success("Company profile updated successfully", saved));
    }

    // ── Multi-Tenant Security Isolation Helper ──

    private Company resolveAuthenticatedCompany(UserPrincipal principal) {
        return companySecurityService.resolveManagerCompany(principal);
    }

    public record CandidateSummary(Long id, String firstName, String lastName, String email) {
        static CandidateSummary from(User user) {
            return new CandidateSummary(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail());
        }
    }

    public record RecruiterSummary(Long id, Long userId, String firstName, String lastName, String email,
                                   String designation, boolean active, boolean companyVerified) {
        static RecruiterSummary from(HrProfile hr) {
            return new RecruiterSummary(hr.getId(), hr.getUser() == null ? null : hr.getUser().getId(),
                    hr.getFirstName(), hr.getLastName(), hr.getEmail(), hr.getDesignation(),
                    hr.isActive(), hr.isCompanyVerified());
        }
    }
}
