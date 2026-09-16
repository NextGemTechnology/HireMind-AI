package com.talentiq.service.developer;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.dto.developer.DeveloperWorkspaceDto;
import com.talentiq.model.*;
import com.talentiq.repository.company.CompanyCandidateVerificationRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.company.CompanyTaskRepository;
import com.talentiq.repository.developer.DeveloperDailyUpdateRepository;
import com.talentiq.repository.employee.EmployeePerformanceRepository;
import com.talentiq.repository.employee.EmployeeRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeveloperWorkspaceServiceImpl implements DeveloperWorkspaceService {

    private final EmployeeRepository employeeRepository;
    private final CompanyCandidateVerificationRepository verificationRepository;
    private final CompanyTaskRepository taskRepository;
    private final DeveloperDailyUpdateRepository dailyUpdateRepository;
    private final EmployeePerformanceRepository performanceRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    @Override
    public DeveloperWorkspaceDto.EligibilityResponse checkEligibility(Long userId) {
        List<Employee> employees = employeeRepository.findByUserId(userId);
        Employee activeEmp = employees.stream()
                .filter(e -> e.getStatus() == EmployeeStatus.ACTIVE)
                .findFirst()
                .orElse(null);

        List<CompanyCandidateVerification> verifs = verificationRepository.findByCandidateUserId(userId);
        CompanyCandidateVerification approvedVerif = verifs.stream()
                .filter(v -> "APPROVED".equalsIgnoreCase(v.getStatus()) || "VERIFIED".equalsIgnoreCase(v.getStatus()))
                .findFirst()
                .orElse(null);

        boolean isVerified = approvedVerif != null || (activeEmp != null && activeEmp.getVerification() != null &&
                ("APPROVED".equalsIgnoreCase(activeEmp.getVerification().getStatus()) || "VERIFIED".equalsIgnoreCase(activeEmp.getVerification().getStatus())));
        boolean isActive = activeEmp != null && activeEmp.getStatus() == EmployeeStatus.ACTIVE;
        boolean hasWorkspaceAccess = activeEmp != null && activeEmp.isWorkspaceAccess();

        boolean eligible = isVerified && isActive && hasWorkspaceAccess;

        String verifiedStatus = isVerified ? "VERIFIED" : (verifs.isEmpty() ? "NONE" : verifs.get(0).getStatus());
        String employmentStatus = activeEmp != null ? activeEmp.getStatus().name() : (employees.isEmpty() ? "NONE" : employees.get(0).getStatus().name());

        Company comp = activeEmp != null ? activeEmp.getCompany() : (approvedVerif != null ? approvedVerif.getCompany() : null);

        String message;
        if (eligible) {
            message = "Candidate is verified with active employment and developer workspace privileges.";
        } else if (!isVerified) {
            message = "Company candidate verification tag is pending or not yet approved by company leadership.";
        } else if (!isActive) {
            message = "Candidate employment is not active (Status: " + employmentStatus + ").";
        } else {
            message = "Developer workspace access has not been enabled for this employee account.";
        }

        return DeveloperWorkspaceDto.EligibilityResponse.builder()
                .eligible(eligible)
                .verifiedStatus(verifiedStatus)
                .employmentStatus(employmentStatus)
                .workspaceAccess(hasWorkspaceAccess)
                .companyId(comp != null ? comp.getId() : null)
                .companyName(comp != null ? comp.getName() : null)
                .companyLogoUrl(comp != null ? comp.getLogoUrl() : null)
                .jobTitle(activeEmp != null ? activeEmp.getJobTitle() : (approvedVerif != null ? approvedVerif.getJobTitle() : null))
                .department(activeEmp != null ? activeEmp.getDepartment() : (approvedVerif != null ? approvedVerif.getDepartment() : null))
                .employeeCode(activeEmp != null ? activeEmp.getEmployeeCode() : null)
                .badgeCertificateId(approvedVerif != null ? approvedVerif.getBadgeCertificateId() : (activeEmp != null && activeEmp.getVerification() != null ? activeEmp.getVerification().getBadgeCertificateId() : null))
                .message(message)
                .build();
    }

    @Override
    @Transactional
    public DeveloperWorkspaceDto.OverviewResponse getOverview(Long userId) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        Employee emp = employeeRepository.findByUserId(userId).stream()
                .filter(e -> e.getStatus() == EmployeeStatus.ACTIVE)
                .findFirst()
                .orElseThrow(() -> new ForbiddenException("No active employee record found for user."));

        DeveloperWorkspaceDto.EmployeeInfo employeeInfo = DeveloperWorkspaceDto.EmployeeInfo.builder()
                .employeeId(emp.getId())
                .companyId(emp.getCompany().getId())
                .companyName(emp.getCompany().getName())
                .companyLogoUrl(emp.getCompany().getLogoUrl())
                .jobTitle(emp.getJobTitle())
                .department(emp.getDepartment())
                .employeeCode(emp.getEmployeeCode())
                .employmentType(emp.getEmploymentType() != null ? emp.getEmploymentType().name() : "FULL_TIME")
                .joinDate(emp.getJoinDate())
                .verifiedAt(emp.getVerifiedAt())
                .badgeCertificateId(eligibility.getBadgeCertificateId())
                .build();

        // 1. Fetch Assigned Tasks for this candidate in this company
        List<CompanyTask> userTasks = taskRepository.findByCompanyIdAndAssignedToUserIdOrderByCreatedAtDesc(emp.getCompany().getId(), userId);

        // If no tasks exist yet in DB for this developer, seed initial active sprint tasks for them
        if (userTasks.isEmpty()) {
            userTasks = seedInitialTasksForDeveloper(userId, emp);
        }

        List<DeveloperWorkspaceDto.TaskItem> taskItems = new ArrayList<>();
        int completedCount = 0;
        int totalCount = userTasks.size();

        for (CompanyTask t : userTasks) {
            boolean isDone = "COMPLETED".equalsIgnoreCase(t.getStatus());
            if (isDone) completedCount++;
            taskItems.add(DeveloperWorkspaceDto.TaskItem.builder()
                    .id(t.getId())
                    .taskCode("WEB-" + (300 + (t.getId() != null ? t.getId() % 100 : 10)))
                    .title(t.getTitle())
                    .description(t.getDescription())
                    .priority(t.getPriority())
                    .status(t.getStatus())
                    .category(t.getCategory())
                    .dueDate(t.getDueDate())
                    .completedAt(t.getCompletedAt())
                    .build());
        }

        // 2. Sprint Info
        int progressPct = totalCount > 0 ? (int) Math.round(((double) completedCount / totalCount) * 100) : 60;
        DeveloperWorkspaceDto.SprintInfo sprintInfo = DeveloperWorkspaceDto.SprintInfo.builder()
                .name("Platform Improvement Sprint")
                .status("In Progress")
                .startDate("Apr 15, 2024")
                .endDate("Apr 28, 2024")
                .description("Improve platform stability, performance and user experience.")
                .completedTasks(completedCount > 0 ? completedCount : 6)
                .totalTasks(totalCount > 0 ? totalCount : 10)
                .progressPercentage(progressPct)
                .focusTags(List.of("Stability", "Performance", "User Experience"))
                .build();

        // 3. Today's Daily Update (if submitted today)
        Instant startOfDay = LocalDate.now().atStartOfDay(ZoneId.of("UTC")).toInstant();
        List<DeveloperDailyUpdate> todayUpdates = dailyUpdateRepository.findTodayUpdates(userId, startOfDay);
        DeveloperWorkspaceDto.DailyUpdateItem todayUpdateItem = null;
        if (!todayUpdates.isEmpty()) {
            DeveloperDailyUpdate du = todayUpdates.get(0);
            todayUpdateItem = DeveloperWorkspaceDto.DailyUpdateItem.builder()
                    .id(du.getId())
                    .workSummary(du.getWorkSummary())
                    .blockers(du.getBlockers())
                    .submittedAt(du.getSubmittedAt())
                    .dateStr(DateTimeFormatter.ofPattern("MMM dd, yyyy").withZone(ZoneId.systemDefault()).format(du.getSubmittedAt()))
                    .build();
        }

        // 4. Team Channels (Company scoped)
        List<DeveloperWorkspaceDto.ChannelItem> channels = List.of(
                DeveloperWorkspaceDto.ChannelItem.builder()
                        .id(1L)
                        .name("engineering")
                        .description("Core engineering & architecture sync")
                        .unreadCount(12)
                        .activityStatus("Active now - 12 new messages")
                        .isPrivate(false)
                        .build(),
                DeveloperWorkspaceDto.ChannelItem.builder()
                        .id(2L)
                        .name("platform")
                        .description("Platform stability and infrastructure")
                        .unreadCount(3)
                        .activityStatus("3 new messages")
                        .isPrivate(false)
                        .build(),
                DeveloperWorkspaceDto.ChannelItem.builder()
                        .id(3L)
                        .name("frontend")
                        .description("UI/UX components & frontend engineering")
                        .unreadCount(1)
                        .activityStatus("1 new message")
                        .isPrivate(false)
                        .build(),
                DeveloperWorkspaceDto.ChannelItem.builder()
                        .id(4L)
                        .name("general")
                        .description("All hands & general company updates")
                        .unreadCount(0)
                        .activityStatus("No new messages")
                        .isPrivate(false)
                        .build()
        );

        // 5. Performance Metrics
        DeveloperWorkspaceDto.PerformanceMetric performanceMetric = DeveloperWorkspaceDto.PerformanceMetric.builder()
                .tasksCompleted(completedCount > 0 ? completedCount : 8)
                .tasksCompletedPeriod("This sprint")
                .avgResponseTime("24h")
                .avgResponsePeriod("This week")
                .sprintStatus("On track")
                .sprintStatusNote("Great progress")
                .managerRating("4.8 / 5")
                .managerRatingPeriod("Last 30 days")
                .motivationalQuote("Consistent effort leads to outstanding results. Keep it up!")
                .build();

        return DeveloperWorkspaceDto.OverviewResponse.builder()
                .employee(employeeInfo)
                .todayTasks(taskItems)
                .currentSprint(sprintInfo)
                .todayDailyUpdate(todayUpdateItem)
                .teamChannels(channels)
                .performance(performanceMetric)
                .build();
    }

    private List<CompanyTask> seedInitialTasksForDeveloper(Long userId, Employee emp) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<CompanyTask> seeded = new ArrayList<>();

        CompanyTask t1 = CompanyTask.builder()
                .company(emp.getCompany())
                .creatorUser(user)
                .assignedToUser(user)
                .assignedToName(user.getFirstName() + " " + user.getLastName())
                .title("Fix login redirect issue")
                .description("Resolve race condition and history replacement on authentication redirects.")
                .priority("HIGH")
                .category("HIRING")
                .status("COMPLETED")
                .completedAt(Instant.now())
                .build();
        seeded.add(taskRepository.save(t1));

        CompanyTask t2 = CompanyTask.builder()
                .company(emp.getCompany())
                .creatorUser(user)
                .assignedToUser(user)
                .assignedToName(user.getFirstName() + " " + user.getLastName())
                .title("Implement user profile API")
                .description("Build endpoint to retrieve verified employee credentials and developer workspace state.")
                .priority("HIGH")
                .category("HIRING")
                .status("IN_PROGRESS")
                .build();
        seeded.add(taskRepository.save(t2));

        CompanyTask t3 = CompanyTask.builder()
                .company(emp.getCompany())
                .creatorUser(user)
                .assignedToUser(user)
                .assignedToName(user.getFirstName() + " " + user.getLastName())
                .title("Code review: PR #782")
                .description("Review pull request for candidate authentication hardening and unit test coverage.")
                .priority("MEDIUM")
                .category("GENERAL")
                .status("TODO")
                .build();
        seeded.add(taskRepository.save(t3));

        CompanyTask t4 = CompanyTask.builder()
                .company(emp.getCompany())
                .creatorUser(user)
                .assignedToUser(user)
                .assignedToName(user.getFirstName() + " " + user.getLastName())
                .title("Update unit tests")
                .description("Add integration tests verifying eligible and non-eligible workspace states.")
                .priority("LOW")
                .category("GENERAL")
                .status("TODO")
                .build();
        seeded.add(taskRepository.save(t4));

        return seeded;
    }

    @Override
    @Transactional
    public DeveloperWorkspaceDto.TaskItem updateTaskStatus(Long userId, Long taskId, DeveloperWorkspaceDto.UpdateTaskStatusRequest request) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        CompanyTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", "id", taskId));

        if (task.getAssignedToUser() == null || !task.getAssignedToUser().getId().equals(userId)) {
            throw new ForbiddenException("Access Denied: You cannot modify tasks that are not assigned to your developer account.");
        }

        String newStatus = request.getStatus().toUpperCase();
        task.setStatus(newStatus);
        if ("COMPLETED".equalsIgnoreCase(newStatus)) {
            task.setCompletedAt(Instant.now());
        } else {
            task.setCompletedAt(null);
        }

        CompanyTask saved = taskRepository.save(task);

        return DeveloperWorkspaceDto.TaskItem.builder()
                .id(saved.getId())
                .taskCode("WEB-" + (300 + (saved.getId() != null ? saved.getId() % 100 : 10)))
                .title(saved.getTitle())
                .description(saved.getDescription())
                .priority(saved.getPriority())
                .status(saved.getStatus())
                .category(saved.getCategory())
                .dueDate(saved.getDueDate())
                .completedAt(saved.getCompletedAt())
                .build();
    }

    @Override
    @Transactional
    public DeveloperWorkspaceDto.DailyUpdateItem submitDailyUpdate(Long userId, DeveloperWorkspaceDto.SubmitDailyUpdateRequest request) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Company company = companyRepository.findById(eligibility.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", eligibility.getCompanyId()));

        DeveloperDailyUpdate dailyUpdate = DeveloperDailyUpdate.builder()
                .user(user)
                .company(company)
                .workSummary(request.getWorkSummary().trim())
                .blockers(request.getBlockers() != null ? request.getBlockers().trim() : null)
                .submittedAt(Instant.now())
                .build();

        DeveloperDailyUpdate saved = dailyUpdateRepository.save(dailyUpdate);

        return DeveloperWorkspaceDto.DailyUpdateItem.builder()
                .id(saved.getId())
                .workSummary(saved.getWorkSummary())
                .blockers(saved.getBlockers())
                .submittedAt(saved.getSubmittedAt())
                .dateStr(DateTimeFormatter.ofPattern("MMM dd, yyyy").withZone(ZoneId.systemDefault()).format(saved.getSubmittedAt()))
                .build();
    }

    @Override
    public List<DeveloperWorkspaceDto.DailyUpdateItem> getDailyUpdates(Long userId) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        List<DeveloperDailyUpdate> updates = dailyUpdateRepository.findByUserIdOrderBySubmittedAtDesc(userId);
        List<DeveloperWorkspaceDto.DailyUpdateItem> result = new ArrayList<>();
        for (DeveloperDailyUpdate u : updates) {
            result.add(DeveloperWorkspaceDto.DailyUpdateItem.builder()
                    .id(u.getId())
                    .workSummary(u.getWorkSummary())
                    .blockers(u.getBlockers())
                    .submittedAt(u.getSubmittedAt())
                    .dateStr(DateTimeFormatter.ofPattern("MMM dd, yyyy").withZone(ZoneId.systemDefault()).format(u.getSubmittedAt()))
                    .build());
        }
        return result;
    }

    @Override
    public List<DeveloperWorkspaceDto.TaskItem> getMyTasks(Long userId, String status) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        List<CompanyTask> tasks = taskRepository.findByAssignedToUserIdOrderByCreatedAtDesc(userId);
        List<DeveloperWorkspaceDto.TaskItem> result = new ArrayList<>();
        for (CompanyTask t : tasks) {
            if (status == null || status.isBlank() || t.getStatus().equalsIgnoreCase(status)) {
                result.add(DeveloperWorkspaceDto.TaskItem.builder()
                        .id(t.getId())
                        .taskCode("WEB-" + (300 + (t.getId() != null ? t.getId() % 100 : 10)))
                        .title(t.getTitle())
                        .description(t.getDescription())
                        .priority(t.getPriority())
                        .status(t.getStatus())
                        .category(t.getCategory())
                        .dueDate(t.getDueDate())
                        .completedAt(t.getCompletedAt())
                        .build());
            }
        }
        return result;
    }

    @Override
    public List<DeveloperWorkspaceDto.ProjectItem> getMyProjects(Long userId) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        return List.of(
                DeveloperWorkspaceDto.ProjectItem.builder()
                        .id(1L)
                        .name("TalentIQ Core Platform")
                        .description("Main application repository and microservices ecosystem")
                        .repoUrl("github.com/brightstack/talentiq-core")
                        .techStack("Java, Spring Boot, MySQL, Redis, React, TypeScript")
                        .status("Active")
                        .openIssues(4)
                        .activePullRequests(2)
                        .build(),
                DeveloperWorkspaceDto.ProjectItem.builder()
                        .id(2L)
                        .name("Developer SDK & APIs")
                        .description("Internal APIs, developer integration tools, and webhooks engine")
                        .repoUrl("github.com/brightstack/developer-sdk")
                        .techStack("TypeScript, Node.js, REST, WebSockets")
                        .status("In Development")
                        .openIssues(2)
                        .activePullRequests(1)
                        .build()
        );
    }

    @Override
    public DeveloperWorkspaceDto.PerformanceMetric getMyPerformance(Long userId) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        return DeveloperWorkspaceDto.PerformanceMetric.builder()
                .tasksCompleted(8)
                .tasksCompletedPeriod("This sprint")
                .avgResponseTime("24h")
                .avgResponsePeriod("This week")
                .sprintStatus("On track")
                .sprintStatusNote("Great progress")
                .managerRating("4.8 / 5")
                .managerRatingPeriod("Last 30 days")
                .motivationalQuote("Consistent effort leads to outstanding results. Keep it up!")
                .build();
    }

    @Override
    public DeveloperWorkspaceDto.EmployeeInfo getWorkProfile(Long userId) {
        DeveloperWorkspaceDto.EligibilityResponse eligibility = checkEligibility(userId);
        if (!eligibility.isEligible()) {
            throw new ForbiddenException("Developer Workspace access denied: " + eligibility.getMessage());
        }

        Employee emp = employeeRepository.findByUserId(userId).stream()
                .filter(e -> e.getStatus() == EmployeeStatus.ACTIVE)
                .findFirst()
                .orElseThrow(() -> new ForbiddenException("No active employee record found."));

        return DeveloperWorkspaceDto.EmployeeInfo.builder()
                .employeeId(emp.getId())
                .companyId(emp.getCompany().getId())
                .companyName(emp.getCompany().getName())
                .companyLogoUrl(emp.getCompany().getLogoUrl())
                .jobTitle(emp.getJobTitle())
                .department(emp.getDepartment())
                .employeeCode(emp.getEmployeeCode())
                .employmentType(emp.getEmploymentType() != null ? emp.getEmploymentType().name() : "FULL_TIME")
                .joinDate(emp.getJoinDate())
                .verifiedAt(emp.getVerifiedAt())
                .badgeCertificateId(eligibility.getBadgeCertificateId())
                .build();
    }
}

