package com.talentiq.controller.analytics;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.analytics.AnalyticsDto;
import com.talentiq.service.analytics.AnalyticsService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics & Telemetry", description = "Recruiter dashboards, platform metrics, and user event tracking")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @PostMapping("/events")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Log a telemetry user analytics event")
    public ResponseEntity<ApiResponse<Void>> logEvent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AnalyticsDto.EventRequest request,
            HttpServletRequest servletRequest) {

        String ip = servletRequest.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");

        Long userId = principal != null ? principal.getId() : null;
        analyticsService.logEvent(userId, request, ip, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Event logged"));
    }

    @GetMapping("/hr")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Get recruiter company KPI dashboard (conversion rates, time-to-hire)")
    public ResponseEntity<ApiResponse<AnalyticsDto.HrDashboardResponse>> getHrDashboard(
            @AuthenticationPrincipal UserPrincipal principal) {
        AnalyticsDto.HrDashboardResponse dashboard = analyticsService.getHrAnalyticsDashboard(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get platform-wide overview metrics (Platform Admin only)")
    public ResponseEntity<ApiResponse<AnalyticsDto.PlatformOverviewResponse>> getPlatformOverview(
            @AuthenticationPrincipal UserPrincipal principal) {
        AnalyticsDto.PlatformOverviewResponse overview = analyticsService.getPlatformOverview(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(overview));
    }

    @GetMapping("/public-stats")
    @Operation(summary = "Get public platform metrics and real-time statistics cached in Redis")
    public ResponseEntity<ApiResponse<AnalyticsDto.PublicPlatformStatsResponse>> getPublicStats() {
        AnalyticsDto.PublicPlatformStatsResponse stats = analyticsService.getPublicPlatformStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
