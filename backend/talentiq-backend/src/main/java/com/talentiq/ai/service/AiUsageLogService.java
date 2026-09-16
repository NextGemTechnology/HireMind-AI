package com.talentiq.ai.service;
import com.talentiq.ai.model.*;

import com.talentiq.ai.model.AiUsageLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AiUsageLogService {

    AiUsageLog logUsage(Long userId, Long companyId, String feature, String model,
                        int promptTokens, int completionTokens, int latencyMs,
                        String status, String errorMessage);

    long getDailyTokenUsage(Long userId);

    long getDailyCompanyTokenUsage(Long companyId);

    boolean isDailyQuotaExceeded(Long userId, int dailyLimit);

    Page<AiUsageLog> getUserUsageLogs(Long userId, Pageable pageable);
}
