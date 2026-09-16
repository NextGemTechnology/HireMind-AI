package com.talentiq.service.company;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.dto.company.CompanyTaskDto;
import com.talentiq.model.Company;
import com.talentiq.model.CompanyTask;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.company.CompanyTaskRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyTaskServiceImpl implements CompanyTaskService {

    private final CompanyTaskRepository taskRepository;
    private final HrProfileRepository hrProfileRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final CompanySecurityService companySecurityService;

    private Company resolveCompany(Long userId) {
        var managerCompany = companySecurityService.currentManagerCompany(userId);
        if (managerCompany.isPresent()) return managerCompany.get();
        HrProfile hrProfile = hrProfileRepository.findById(userId)
                .or(() -> hrProfileRepository.findByUserId(userId))
                .orElse(null);
        if (hrProfile != null && hrProfile.getCompany() != null) {
            if (!hrProfile.isCompanyVerified() && !hrProfile.isCompanyAdmin()) {
                throw new ForbiddenException("Access Denied: You must be an officially verified HR recruiter for "
                        + hrProfile.getCompany().getName() + " to access corporate task roadmaps.");
            }
            return hrProfile.getCompany();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Check if Company Admin
        Company company = companyRepository.findAll().stream()
                .filter(c -> (c.getRegisteredByUserId() != null && c.getRegisteredByUserId().equals(userId))
                        || user.getEmail().equalsIgnoreCase(c.getEmail()))
                .findFirst()
                .orElse(null);

        if (company != null) {
            return company;
        }

        if (user.getRoles().contains(com.talentiq.common.enums.Role.ROLE_SUPER_ADMIN)
                || user.getRoles().contains(com.talentiq.common.enums.Role.ROLE_PLATFORM_ADMIN)) {
            return companyRepository.findAll().stream().filter(Company::isActive).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Company", "userId", userId));
        }

        throw new ForbiddenException("Access Denied: You are not associated with any corporate workspace.");
    }

    @Override
    public CompanyTaskDto.TaskResponse createTask(Long currentUserId, CompanyTaskDto.CreateTaskRequest request) {
        User creator = userRepository.findById(companySecurityService.currentManagerActorId(currentUserId).orElse(currentUserId))
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        Company company = resolveCompany(currentUserId);

        User assignedTo = null;
        String assignedName = null;
        if (request.getAssignedToUserId() != null) {
            assignedTo = userRepository.findById(request.getAssignedToUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee", "id", request.getAssignedToUserId()));
            HrProfile assignee = hrProfileRepository.findByUserId(assignedTo.getId())
                    .orElseThrow(() -> new ForbiddenException("Assignee must be a recruiter in your company"));
            if (!assignee.isActive() || assignee.getCompany() == null || !assignee.getCompany().getId().equals(company.getId())) {
                throw new ForbiddenException("Assignee must be an active recruiter in your company");
            }
            assignedName = assignedTo.getFullName();
        }

        CompanyTask task = CompanyTask.builder()
                .company(company)
                .creatorUser(creator)
                .assignedToUser(assignedTo)
                .assignedToName(assignedName)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority().toUpperCase() : "MEDIUM")
                .category(request.getCategory() != null ? request.getCategory().toUpperCase() : "GENERAL")
                .status("TODO")
                .dueDate(request.getDueDate())
                .build();

        CompanyTask saved = taskRepository.save(task);
        log.info("Company task ID {} created by User ID {} for Company ID {}", saved.getId(), currentUserId, company.getId());
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyTaskDto.TaskResponse> getCompanyTasks(Long currentUserId, String status, Long assignedToUserId) {
        Company company = resolveCompany(currentUserId);
        List<CompanyTask> tasks;

        if (status != null && !status.trim().isEmpty()) {
            tasks = taskRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(company.getId(), status.toUpperCase());
        } else if (assignedToUserId != null) {
            tasks = taskRepository.findByCompanyIdAndAssignedToUserIdOrderByCreatedAtDesc(company.getId(), assignedToUserId);
        } else {
            tasks = taskRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());
        }

        return tasks.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public CompanyTaskDto.TaskResponse updateTaskStatus(Long currentUserId, Long taskId, CompanyTaskDto.UpdateStatusRequest request) {
        Company company = resolveCompany(currentUserId);
        CompanyTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("CompanyTask", "id", taskId));
        requireTaskCompany(task, company);

        String newStatus = request.getStatus().toUpperCase();
        if (!java.util.Set.of("TODO", "IN_PROGRESS", "COMPLETED").contains(newStatus)) {
            throw new com.talentiq.common.exception.BadRequestException("Invalid task status");
        }
        task.setStatus(newStatus);
        if ("COMPLETED".equals(newStatus)) {
            task.setCompletedAt(Instant.now());
        } else {
            task.setCompletedAt(null);
        }

        CompanyTask saved = taskRepository.save(task);
        log.info("Company task ID {} status updated to {}", taskId, newStatus);
        return mapToDto(saved);
    }

    @Override
    public void deleteTask(Long currentUserId, Long taskId) {
        Company company = resolveCompany(currentUserId);
        CompanyTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("CompanyTask", "id", taskId));
        requireTaskCompany(task, company);
        taskRepository.delete(task);
        log.info("Company task ID {} deleted by User ID {}", taskId, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyTaskDto.TaskStatsResponse getTaskStats(Long currentUserId) {
        Company company = resolveCompany(currentUserId);
        List<CompanyTask> all = taskRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());

        long total = all.size();
        long completed = all.stream().filter(t -> "COMPLETED".equals(t.getStatus())).count();
        long inProgress = all.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus())).count();
        long todo = all.stream().filter(t -> "TODO".equals(t.getStatus())).count();
        double rate = total > 0 ? ((double) completed / total) * 100.0 : 0.0;

        return CompanyTaskDto.TaskStatsResponse.builder()
                .totalTasks(total)
                .completedTasks(completed)
                .inProgressTasks(inProgress)
                .todoTasks(todo)
                .completionRate(Math.round(rate * 10.0) / 10.0)
                .build();
    }

    private void requireTaskCompany(CompanyTask task, Company company) {
        if (!task.getCompany().getId().equals(company.getId())) throw new ForbiddenException("Task does not belong to your company");
    }

    private CompanyTaskDto.TaskResponse mapToDto(CompanyTask t) {
        return CompanyTaskDto.TaskResponse.builder()
                .id(t.getId())
                .companyId(t.getCompany().getId())
                .companyName(t.getCompany().getName())
                .creatorUserId(t.getCreatorUser().getId())
                .creatorName(t.getCreatorUser().getFirstName() + " " + t.getCreatorUser().getLastName())
                .assignedToUserId(t.getAssignedToUser() != null ? t.getAssignedToUser().getId() : null)
                .assignedToName(t.getAssignedToName() != null ? t.getAssignedToName() : (t.getAssignedToUser() != null ? t.getAssignedToUser().getFirstName() + " " + t.getAssignedToUser().getLastName() : "Unassigned"))
                .title(t.getTitle())
                .description(t.getDescription())
                .priority(t.getPriority())
                .category(t.getCategory())
                .status(t.getStatus())
                .dueDate(t.getDueDate())
                .completedAt(t.getCompletedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
