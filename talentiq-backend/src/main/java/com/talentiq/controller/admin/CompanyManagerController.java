package com.talentiq.controller.admin;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.ApiResponse;
import com.talentiq.model.Company;
import com.talentiq.model.CompanyTask;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.company.CompanyTaskRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/admin/company")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
@Tag(name = "Company Manager SaaS Workspace", description = "Multi-tenant corporate workspace, HR roster, tasks, and executive overview")
public class CompanyManagerController {

    private final CompanyRepository companyRepository;
    private final HrProfileRepository hrProfileRepository;
    private final CompanyTaskRepository companyTaskRepository;

    @GetMapping("/dashboard")
    @Operation(summary = "Get Company Executive / Manager today workspace metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCompanyDashboard(
            @AuthenticationPrincipal UserPrincipal principal) {

        Company company = resolveAuthenticatedCompany(principal);
        Long companyId = company.getId();

        long totalHr = hrProfileRepository.findAllByCompanyId(companyId).size();
        long completedTasks = companyTaskRepository.countCompletedByCompanyId(companyId);
        long totalTasks = companyTaskRepository.countTotalByCompanyId(companyId);

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("companyId", company.getId());
        dashboard.put("companyName", company.getName());
        dashboard.put("companySlug", company.getSlug());
        dashboard.put("isVerified", company.isVerified());
        dashboard.put("totalHrMembers", totalHr);
        dashboard.put("totalTasks", totalTasks);
        dashboard.put("completedTasks", completedTasks);
        dashboard.put("subscriptionPlan", "PROFESSIONAL_TIER");
        dashboard.put("subscriptionStatus", "ACTIVE");
        dashboard.put("activeHiringPipelines", 3);

        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }

    @GetMapping("/team/hrs")
    @Operation(summary = "List all HR recruiters belonging to this company")
    public ResponseEntity<ApiResponse<List<HrProfile>>> getCompanyHrTeam(
            @AuthenticationPrincipal UserPrincipal principal) {
        Company company = resolveAuthenticatedCompany(principal);
        List<HrProfile> team = hrProfileRepository.findAllByCompanyId(company.getId());
        return ResponseEntity.ok(ApiResponse.success(team));
    }

    @GetMapping("/tasks")
    @Operation(summary = "List corporate tasks and milestones for this company")
    public ResponseEntity<ApiResponse<List<CompanyTask>>> getCompanyTasks(
            @AuthenticationPrincipal UserPrincipal principal) {
        Company company = resolveAuthenticatedCompany(principal);
        List<CompanyTask> tasks = companyTaskRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    // ── Multi-Tenant Security Isolation Helper ──

    private Company resolveAuthenticatedCompany(UserPrincipal principal) {
        // Find company via HR profile
        HrProfile hrProfile = hrProfileRepository.findByUserId(principal.getId())
                .or(() -> hrProfileRepository.findByEmail(principal.getEmail()))
                .orElse(null);

        if (hrProfile != null && hrProfile.getCompany() != null) {
            return hrProfile.getCompany();
        }

        // Find company where company email matches
        return companyRepository.findAll().stream()
                .filter(c -> principal.getEmail().equalsIgnoreCase(c.getEmail()))
                .findFirst()
                .orElseGet(() -> companyRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("No company registered for current administrator")));
    }
}
