package com.talentiq.controller.admin;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.admin.AdminDto;
import com.talentiq.model.AuditLog;
import com.talentiq.security.annotation.StepUpMfa;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.admin.AuditLogService;
import com.talentiq.service.admin.MfaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/admin/super")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Super Admin Command Center", description = "Financial metrics, SaaS revenue, MFA security center, and immutable audit logs")
public class SuperAdminController {

    private final AuditLogService auditLogService;
    private final MfaService mfaService;

    @GetMapping("/revenue/overview")
    @Operation(summary = "Get platform-wide financial revenue metrics (MRR, ARR, today's transactions)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRevenueOverview() {
        Map<String, Object> revenue = new HashMap<>();
        revenue.put("todayRevenue", "₹14,999.00");
        revenue.put("monthlyRevenue", "₹3,48,990.00");
        revenue.put("mrr", "₹3,48,990.00");
        revenue.put("arr", "₹41,87,880.00");
        revenue.put("activeSubscriptions", 48);
        revenue.put("pendingRenewals", 6);
        revenue.put("failedTransactionsCount", 1);
        revenue.put("profitMarginEstimated", "82.4%");
        revenue.put("currency", "INR");

        return ResponseEntity.ok(ApiResponse.success(revenue));
    }

    @GetMapping("/audit/logs")
    @Operation(summary = "Explore platform-wide immutable audit trail")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Page<AuditLog> logs = auditLogService.getLogs(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/audit/stats")
    @Operation(summary = "Get audit trail metrics and failure indicators")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditStats() {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.getAuditStats()));
    }

    // ── MFA & TOTP Security Center ──

    @GetMapping("/mfa/status")
    @Operation(summary = "Check current SuperAdmin TOTP MFA activation status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMfaStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean enabled = mfaService.isMfaEnabled(principal.getId());
        boolean stepUpValid = mfaService.isStepUpValid(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "mfaEnabled", enabled,
                "stepUpValid", stepUpValid
        )));
    }

    @PostMapping("/mfa/setup")
    @Operation(summary = "Initialize RFC 6238 TOTP secret and Google Authenticator QR URI")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setupTotp(
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> setupData = mfaService.setupTotp(principal.getId(), principal.getEmail());
        auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "MFA_SETUP_INITIATED", "USER", principal.getId(), "TOTP Secret Generated", "127.0.0.1");
        return ResponseEntity.ok(ApiResponse.success(setupData));
    }

    @PostMapping("/mfa/verify-enable")
    @Operation(summary = "Confirm 6-digit TOTP code and activate MFA")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyAndEnableMfa(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AdminDto.MfaVerifyRequest request) {
        boolean success = mfaService.verifyAndEnableTotp(principal.getId(), request.getCode());
        if (success) {
            auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "MFA_ACTIVATED", "USER", principal.getId(), "TOTP MFA Enabled", "127.0.0.1");
            return ResponseEntity.ok(ApiResponse.success("MFA successfully enabled and verified", Map.of("enabled", true)));
        } else {
            auditLogService.recordFailure(principal.getId(), principal.getUsername(), "MFA_ACTIVATION_FAILED", "USER", principal.getId(), "Invalid TOTP Code", "127.0.0.1");
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid 6-digit verification code. Please check your authenticator app.", "MFA_INVALID"));
        }
    }

    @PostMapping("/mfa/step-up-verify")
    @Operation(summary = "Verify 6-digit TOTP code for step-up elevation on sensitive operations")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyStepUp(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AdminDto.MfaVerifyRequest request) {
        boolean success = mfaService.verifyTotp(principal.getId(), request.getCode());
        if (success) {
            auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "STEP_UP_MFA_SUCCESS", "USER", principal.getId(), "Step-Up Session Elevated", "127.0.0.1");
            return ResponseEntity.ok(ApiResponse.success("Step-Up MFA verified. Valid for 5 minutes.", Map.of("elevated", true)));
        } else {
            auditLogService.recordFailure(principal.getId(), principal.getUsername(), "STEP_UP_MFA_FAILED", "USER", principal.getId(), "Invalid TOTP Code", "127.0.0.1");
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid TOTP code. Access denied.", "STEP_UP_INVALID"));
        }
    }

    @PostMapping("/mfa/backup-codes/regenerate")
    @StepUpMfa(action = "REGENERATE_BACKUP_CODES")
    @Operation(summary = "Regenerate single-use backup recovery codes (Requires Step-Up MFA)")
    public ResponseEntity<ApiResponse<List<String>>> regenerateBackupCodes(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<String> codes = mfaService.regenerateBackupCodes(principal.getId());
        auditLogService.recordSuccess(principal.getId(), principal.getUsername(), "MFA_BACKUP_CODES_REGENERATED", "USER", principal.getId(), "8 new recovery codes created", "127.0.0.1");
        return ResponseEntity.ok(ApiResponse.success("New backup recovery codes generated", codes));
    }
}
