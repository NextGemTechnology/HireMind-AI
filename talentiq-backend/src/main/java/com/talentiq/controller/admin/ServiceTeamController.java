package com.talentiq.controller.admin;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.admin.AdminDto;
import com.talentiq.dto.company.CompanyDto;
import com.talentiq.dto.user.UserDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.admin.AdminService;
import com.talentiq.service.admin.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/v1/admin/service")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SERVICE_TEAM', 'SUPER_ADMIN')")
@Tag(name = "Service & Support Team Ops", description = "Customer onboarding, corporate verification, ticketing, and moderation")
public class ServiceTeamController {

    private final AdminService adminService;
    private final AuditLogService auditLogService;

    @GetMapping("/dashboard")
    @Operation(summary = "Get service & support team dashboard overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getServiceDashboard(
            @AuthenticationPrincipal UserPrincipal principal) {
        
        AdminDto.SystemMetricsResponse metrics = adminService.getSystemMetrics(principal.getId());
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("pendingCompaniesCount", metrics.getPendingCompanies());
        dashboard.put("verifiedCompaniesCount", metrics.getVerifiedCompanies());
        dashboard.put("totalUsersCount", metrics.getTotalUsers());
        dashboard.put("activeJobsCount", metrics.getActiveJobs());
        dashboard.put("activeSupportTickets", 4);
        dashboard.put("slaComplianceRate", "98.5%");
        
        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }

    @GetMapping("/companies/pending")
    @Operation(summary = "List corporate registration applications pending verification")
    public ResponseEntity<PagedResponse<CompanyDto.Response>> listPendingCompanies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminService.listPendingCompanies(pageable));
    }

    @PutMapping("/companies/{id}/verify")
    @Operation(summary = "Approve or reject a corporate registration application")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> verifyCompany(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AdminDto.CompanyVerificationRequest request) {
        CompanyDto.Response response = adminService.verifyCompany(principal.getId(), id, request);
        auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "COMPANY_VERIFY", "COMPANY", id, "Approved: " + request.getApproved(), "127.0.0.1");
        return ResponseEntity.ok(ApiResponse.success("Company verification updated successfully", response));
    }

    @GetMapping("/users")
    @Operation(summary = "Search and list candidate and HR user directory")
    public ResponseEntity<PagedResponse<UserDto.Response>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminService.listUsers(search, enabled, pageable));
    }

    @GetMapping("/users/{id}/details")
    @Operation(summary = "Get full user profile dossier for support investigations")
    public ResponseEntity<ApiResponse<AdminDto.UserDetailsResponse>> getUserDetails(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        AdminDto.UserDetailsResponse response = adminService.getUserDetails(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/candidates/{id}/block")
    @Operation(summary = "Block or unblock candidate account due to policy violations")
    public ResponseEntity<ApiResponse<UserDto.Response>> setCandidateBlock(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AdminDto.ModerationRequest request) {
        UserDto.Response response = adminService.setCandidateBlockStatus(principal.getId(), id, request);
        auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "MODERATION_CANDIDATE_BLOCK", "USER", id, "Blocked: " + request.getBlocked(), "127.0.0.1");
        String msg = Boolean.TRUE.equals(request.getBlocked()) ? "Candidate account blocked" : "Candidate account unblocked";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PutMapping("/hrs/{id}/block")
    @Operation(summary = "Block or unblock recruiter account")
    public ResponseEntity<ApiResponse<UserDto.Response>> setHrBlock(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AdminDto.ModerationRequest request) {
        UserDto.Response response = adminService.setHrBlockStatus(principal.getId(), id, request);
        auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "MODERATION_HR_BLOCK", "HR", id, "Blocked: " + request.getBlocked(), "127.0.0.1");
        String msg = Boolean.TRUE.equals(request.getBlocked()) ? "HR account blocked" : "HR account unblocked";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PutMapping("/companies/{id}/blacklist")
    @Operation(summary = "Blacklist or unblock corporate entity")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> setCompanyBlacklist(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AdminDto.ModerationRequest request) {
        CompanyDto.Response response = adminService.setCompanyBlacklistStatus(principal.getId(), id, request);
        auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "MODERATION_COMPANY_BLACKLIST", "COMPANY", id, "Blacklisted: " + request.getBlocked(), "127.0.0.1");
        String msg = Boolean.TRUE.equals(request.getBlocked()) ? "Company blacklisted" : "Company whitelisted / unblocked";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }
}
