package com.talentiq.controller.employee;

import com.talentiq.common.enums.SalaryStatus;
import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.SalaryDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.employee.SalaryService;
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

import java.util.List;

@RestController
@RequestMapping("/v1/salary")
@RequiredArgsConstructor
@Tag(name = "Salary & Payroll Management", description = "Create, approve, disburse, and track employee salary payments")
public class SalaryController {

    private final SalaryService salaryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Create a salary disbursement record (Status: DRAFT)")
    public ResponseEntity<ApiResponse<SalaryDto.Response>> createSalaryRecord(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SalaryDto.CreateRequest request) {
        SalaryDto.Response res = salaryService.createSalaryRecord(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Salary draft record created", res));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List salary disbursement records for company")
    public ResponseEntity<PagedResponse<SalaryDto.Response>> listSalaries(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) SalaryStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(salaryService.listCompanySalaries(principal.getId(), status, pageable));
    }

    @PutMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Submit a salary record for Company Leadership approval (DRAFT -> PENDING_APPROVAL)")
    public ResponseEntity<ApiResponse<SalaryDto.Response>> submitForApproval(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        SalaryDto.Response res = salaryService.submitSalaryForApproval(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Salary record submitted for approval", res));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Company Leadership approves or rejects salary disbursement")
    public ResponseEntity<ApiResponse<SalaryDto.Response>> decideApproval(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody SalaryDto.ApprovalDecisionRequest request) {
        SalaryDto.Response res = salaryService.decideSalaryApproval(principal.getId(), id, request);
        String msg = request.isApproved() ? "Salary approved and disbursement processed" : "Salary disbursement rejected";
        return ResponseEntity.ok(ApiResponse.success(msg, res));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'CANDIDATE')")
    @Operation(summary = "View salary payment history for a specific employee")
    public ResponseEntity<ApiResponse<List<SalaryDto.Response>>> getEmployeeSalaryHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long employeeId) {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getEmployeeSalaryHistory(principal.getId(), employeeId)));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Candidate views their own completed salary disbursements")
    public ResponseEntity<ApiResponse<List<SalaryDto.Response>>> getMySalaryHistory(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getCandidateCompletedSalaries(principal.getId())));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get salary & payroll statistics for company dashboard")
    public ResponseEntity<ApiResponse<SalaryDto.StatsResponse>> getSalaryStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getSalaryStats(principal.getId())));
    }
}
