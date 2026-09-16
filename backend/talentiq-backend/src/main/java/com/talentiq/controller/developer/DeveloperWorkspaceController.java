package com.talentiq.controller.developer;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.developer.DeveloperWorkspaceDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.developer.DeveloperWorkspaceService;
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
@RequestMapping("/v1/developer-workspace")
@RequiredArgsConstructor
@Tag(name = "Developer Workspace", description = "Protected Developer Workspace for verified Candidate/User accounts")
@PreAuthorize("hasRole('CANDIDATE')")
public class DeveloperWorkspaceController {

    private final DeveloperWorkspaceService workspaceService;

    @GetMapping("/eligibility")
    @Operation(summary = "Check if candidate has verified employment and developer workspace access")
    public ResponseEntity<ApiResponse<DeveloperWorkspaceDto.EligibilityResponse>> checkEligibility(
            @AuthenticationPrincipal UserPrincipal principal) {
        DeveloperWorkspaceDto.EligibilityResponse res = workspaceService.checkEligibility(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/overview")
    @Operation(summary = "Get complete developer workspace dashboard overview")
    public ResponseEntity<ApiResponse<DeveloperWorkspaceDto.OverviewResponse>> getOverview(
            @AuthenticationPrincipal UserPrincipal principal) {
        DeveloperWorkspaceDto.OverviewResponse res = workspaceService.getOverview(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PutMapping("/tasks/{taskId}/status")
    @Operation(summary = "Update status of an assigned developer task")
    public ResponseEntity<ApiResponse<DeveloperWorkspaceDto.TaskItem>> updateTaskStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long taskId,
            @Valid @RequestBody DeveloperWorkspaceDto.UpdateTaskStatusRequest request) {
        DeveloperWorkspaceDto.TaskItem res = workspaceService.updateTaskStatus(principal.getId(), taskId, request);
        return ResponseEntity.ok(ApiResponse.success("Task status updated", res));
    }

    @PostMapping("/daily-updates")
    @Operation(summary = "Submit a daily standup update")
    public ResponseEntity<ApiResponse<DeveloperWorkspaceDto.DailyUpdateItem>> submitDailyUpdate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody DeveloperWorkspaceDto.SubmitDailyUpdateRequest request) {
        DeveloperWorkspaceDto.DailyUpdateItem res = workspaceService.submitDailyUpdate(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Daily update submitted successfully", res));
    }

    @GetMapping("/daily-updates")
    @Operation(summary = "Get historical daily standup updates")
    public ResponseEntity<ApiResponse<List<DeveloperWorkspaceDto.DailyUpdateItem>>> getDailyUpdates(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<DeveloperWorkspaceDto.DailyUpdateItem> res = workspaceService.getDailyUpdates(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/tasks")
    @Operation(summary = "Get assigned developer tasks with optional status filter")
    public ResponseEntity<ApiResponse<List<DeveloperWorkspaceDto.TaskItem>>> getMyTasks(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status) {
        List<DeveloperWorkspaceDto.TaskItem> res = workspaceService.getMyTasks(principal.getId(), status);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/projects")
    @Operation(summary = "Get assigned company projects and repositories")
    public ResponseEntity<ApiResponse<List<DeveloperWorkspaceDto.ProjectItem>>> getMyProjects(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<DeveloperWorkspaceDto.ProjectItem> res = workspaceService.getMyProjects(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/performance")
    @Operation(summary = "Get personal developer performance metrics")
    public ResponseEntity<ApiResponse<DeveloperWorkspaceDto.PerformanceMetric>> getMyPerformance(
            @AuthenticationPrincipal UserPrincipal principal) {
        DeveloperWorkspaceDto.PerformanceMetric res = workspaceService.getMyPerformance(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/work-profile")
    @Operation(summary = "Get developer work profile and verified company credentials")
    public ResponseEntity<ApiResponse<DeveloperWorkspaceDto.EmployeeInfo>> getWorkProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        DeveloperWorkspaceDto.EmployeeInfo res = workspaceService.getWorkProfile(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(res));
    }
}
