package com.talentiq.controller.company;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.company.CompanyTaskDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.company.CompanyTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/company/tasks")
@RequiredArgsConstructor
@Tag(name = "Company Task & Goal Management", description = "Company executive task assignment, goals, and completion tracking")
public class CompanyTaskController {

    private final CompanyTaskService taskService;

    @PostMapping
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'HR', 'SUPER_ADMIN')")
    @Operation(summary = "Create and assign a new company task or goal")
    public ResponseEntity<ApiResponse<CompanyTaskDto.TaskResponse>> createTask(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompanyTaskDto.CreateTaskRequest request) {
        CompanyTaskDto.TaskResponse res = taskService.createTask(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Task created and assigned successfully", res));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'HR', 'SUPER_ADMIN')")
    @Operation(summary = "List all company tasks and goals with optional status filter")
    public ResponseEntity<ApiResponse<List<CompanyTaskDto.TaskResponse>>> getCompanyTasks(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long assignedToUserId) {
        List<CompanyTaskDto.TaskResponse> tasks = taskService.getCompanyTasks(principal.getId(), status, assignedToUserId);
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    @PutMapping("/{taskId}/status")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'HR', 'SUPER_ADMIN')")
    @Operation(summary = "Update task status (TODO, IN_PROGRESS, COMPLETED)")
    public ResponseEntity<ApiResponse<CompanyTaskDto.TaskResponse>> updateStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long taskId,
            @Valid @RequestBody CompanyTaskDto.UpdateStatusRequest request) {
        CompanyTaskDto.TaskResponse res = taskService.updateTaskStatus(principal.getId(), taskId, request);
        return ResponseEntity.ok(ApiResponse.success("Task status updated", res));
    }

    @DeleteMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'HR', 'SUPER_ADMIN')")
    @Operation(summary = "Delete a company task")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long taskId) {
        taskService.deleteTask(principal.getId(), taskId);
        return ResponseEntity.ok(ApiResponse.success("Task deleted successfully", null));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'HR', 'SUPER_ADMIN')")
    @Operation(summary = "Get company task completion statistics and KPIs")
    public ResponseEntity<ApiResponse<CompanyTaskDto.TaskStatsResponse>> getStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        CompanyTaskDto.TaskStatsResponse stats = taskService.getTaskStats(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
