package com.talentiq.controller.publics;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.analytics.AnalyticsDto;
import com.talentiq.service.analytics.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public Platform", description = "Public platform statistics and metrics cached in Redis")
public class PublicController {

    private final AnalyticsService analyticsService;

    @GetMapping("/stats")
    @Operation(summary = "Get real-time platform statistics (candidates, companies, live jobs, success rate)")
    public ResponseEntity<ApiResponse<AnalyticsDto.PublicPlatformStatsResponse>> getPlatformStats() {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getPublicPlatformStats()));
    }
}
