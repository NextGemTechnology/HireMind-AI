package com.talentiq.controller.security;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.security.SecurityAuditDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.security.SecurityAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin/security")
@RequiredArgsConstructor
@Tag(name = "Defensive Security Audit", description = "Automated application security, vulnerability assessment, and defensive health diagnostics")
public class SecurityAuditController {

    private final SecurityAuditService securityAuditService;

    @GetMapping("/audit")
    @PreAuthorize("hasAnyRole('APP_DEVELOPER', 'SERVICE_TEAM', 'SUPER_ADMIN', 'PLATFORM_ADMIN')")
    @Operation(summary = "Run automated defensive security vulnerability and diagnostic assessment")
    public ResponseEntity<ApiResponse<SecurityAuditDto.AuditReportResponse>> runSecurityAudit(
            @AuthenticationPrincipal UserPrincipal principal) {
        SecurityAuditDto.AuditReportResponse report = securityAuditService.runComprehensiveSecurityAudit(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Comprehensive Security & Vulnerability Audit Completed", report));
    }
}
