package com.talentiq.service.analytics;

import com.talentiq.dto.analytics.AnalyticsDto;

public interface AnalyticsService {

    void logEvent(Long userId, AnalyticsDto.EventRequest request, String ipAddress, String userAgent);

    AnalyticsDto.HrDashboardResponse getHrAnalyticsDashboard(Long hrUserId);

    AnalyticsDto.PlatformOverviewResponse getPlatformOverview(Long adminUserId);

    AnalyticsDto.PublicPlatformStatsResponse getPublicPlatformStats();
}
