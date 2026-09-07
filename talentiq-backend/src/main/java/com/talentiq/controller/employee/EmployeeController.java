package com.talentiq.controller.employee;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.EmployeeDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.employee.EmployeeService;
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
@RequestMapping("/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employee Lifecycle Management", description = "Onboard, verify, manage, suspend, and terminate employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Onboard a candidate as an employee (Status: PENDING_VERIFICATION)")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> onboardEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody EmployeeDto.OnboardRequest request) {
        EmployeeDto.Response res = employeeService.onboardEmployee(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Candidate onboarded successfully. Awaiting executive verification.", res));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List company employees with status filter and pagination")
    public ResponseEntity<PagedResponse<EmployeeDto.Response>> listEmployees(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) EmployeeStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(employeeService.listCompanyEmployees(principal.getId(), status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get employee details with status history")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> getEmployeeById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getEmployeeById(principal.getId(), id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update employee details (title, department, salary, code)")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> updateEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody EmployeeDto.UpdateRequest request) {
        EmployeeDto.Response res = employeeService.updateEmployee(principal.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Employee details updated successfully", res));
    }

    @PutMapping("/{id}/verify")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Company Leadership approves or rejects employee verification (PENDING -> ACTIVE / REJECTED)")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> verifyEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody EmployeeDto.VerificationDecisionRequest request) {
        EmployeeDto.Response res = employeeService.verifyEmployee(principal.getId(), id, request);
        String msg = request.isApproved() ? "Employee officially verified and active" : "Employee onboarding rejected";
        return ResponseEntity.ok(ApiResponse.success(msg, res));
    }

    @PostMapping("/{id}/terminate")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Initiate termination request (ACTIVE -> ON_NOTICE)")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> requestTermination(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody EmployeeDto.TerminationRequest request) {
        EmployeeDto.Response res = employeeService.requestTermination(principal.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Termination request submitted for Company Leadership approval", res));
    }

    @PutMapping("/{id}/terminate/decision")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Company Leadership decides on termination request (Approve/Reject)")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> decideTermination(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody EmployeeDto.TerminationDecisionRequest request) {
        EmployeeDto.Response res = employeeService.decideTermination(principal.getId(), id, request);
        String msg = request.isApproved() ? "Termination finalized" : "Termination rejected, employee restored to active";
        return ResponseEntity.ok(ApiResponse.success(msg, res));
    }

    @PutMapping("/{id}/suspend")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Suspend an active employee")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> suspendEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody EmployeeDto.SuspendRequest request) {
        EmployeeDto.Response res = employeeService.suspendEmployee(principal.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Employee suspended", res));
    }

    @PutMapping("/{id}/reinstate")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Reinstate a suspended employee to active status")
    public ResponseEntity<ApiResponse<EmployeeDto.Response>> reinstateEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        EmployeeDto.Response res = employeeService.reinstateEmployee(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Employee reinstated to active status", res));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get audit status transition history for an employee")
    public ResponseEntity<ApiResponse<List<EmployeeDto.StatusHistoryResponse>>> getHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getEmployeeStatusHistory(principal.getId(), id)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get employee dashboard KPI statistics")
    public ResponseEntity<ApiResponse<EmployeeDto.DashboardStatsResponse>> getStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getCompanyDashboardStats(principal.getId())));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Candidate views their own employment records across companies")
    public ResponseEntity<ApiResponse<List<EmployeeDto.Response>>> getMyEmployments(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getCandidateEmployments(principal.getId())));
    }
}
