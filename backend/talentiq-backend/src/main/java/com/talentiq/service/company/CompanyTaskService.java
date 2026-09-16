package com.talentiq.service.company;

import com.talentiq.dto.company.CompanyTaskDto;

import java.util.List;

public interface CompanyTaskService {

    CompanyTaskDto.TaskResponse createTask(Long currentUserId, CompanyTaskDto.CreateTaskRequest request);

    List<CompanyTaskDto.TaskResponse> getCompanyTasks(Long currentUserId, String status, Long assignedToUserId);

    CompanyTaskDto.TaskResponse updateTaskStatus(Long currentUserId, Long taskId, CompanyTaskDto.UpdateStatusRequest request);

    void deleteTask(Long currentUserId, Long taskId);

    CompanyTaskDto.TaskStatsResponse getTaskStats(Long currentUserId);
}
