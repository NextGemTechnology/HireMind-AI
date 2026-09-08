package com.talentiq.service.developer;

import com.talentiq.dto.developer.DeveloperWorkspaceDto;

import java.util.List;

public interface DeveloperWorkspaceService {

    DeveloperWorkspaceDto.EligibilityResponse checkEligibility(Long userId);

    DeveloperWorkspaceDto.OverviewResponse getOverview(Long userId);

    DeveloperWorkspaceDto.TaskItem updateTaskStatus(Long userId, Long taskId, DeveloperWorkspaceDto.UpdateTaskStatusRequest request);

    DeveloperWorkspaceDto.DailyUpdateItem submitDailyUpdate(Long userId, DeveloperWorkspaceDto.SubmitDailyUpdateRequest request);

    List<DeveloperWorkspaceDto.DailyUpdateItem> getDailyUpdates(Long userId);

    List<DeveloperWorkspaceDto.TaskItem> getMyTasks(Long userId, String status);

    List<DeveloperWorkspaceDto.ProjectItem> getMyProjects(Long userId);

    DeveloperWorkspaceDto.PerformanceMetric getMyPerformance(Long userId);

    DeveloperWorkspaceDto.EmployeeInfo getWorkProfile(Long userId);
}
