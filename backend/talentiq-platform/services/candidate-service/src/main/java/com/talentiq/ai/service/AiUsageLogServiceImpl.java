package com.talentiq.ai.service;
import com.talentiq.ai.model.*;

import com.talentiq.ai.model.AiUsageLog;
import com.talentiq.ai.repository.AiUsageLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiUsageLogServiceImpl implements AiUsageLogService {

    private final AiUsageLogRepository usageLogRepository;
    private final StringRedisTemplate redisTemplate;

    private static final String REDIS_TOKEN_PREFIX = "ai:tokens:";

    @Override
    @Transactional
    public AiUsageLog logUsage(Long userId, Long companyId, String feature, String model,
                                int promptTokens, int completionTokens, int latencyMs,
                                String status, String errorMessage) {
        int totalTokens = promptTokens + completionTokens;

        AiUsageLog logEntry = AiUsageLog.builder()
                .userId(userId)
                .companyId(companyId)
                .feature(feature)
                .model(model)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(totalTokens)
                .latencyMs(latencyMs)
                .status(status != null ? status : "SUCCESS")
                .errorMessage(errorMessage)
                .createdAt(Instant.now())
                .build();

        AiUsageLog saved = usageLogRepository.save(logEntry);

        // Increment Redis daily token counter
        try {
            String redisKey = REDIS_TOKEN_PREFIX + userId + ":" + LocalDate.now(ZoneOffset.UTC);
            redisTemplate.opsForValue().increment(redisKey, totalTokens);
            redisTemplate.expire(redisKey, 25, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("Failed to increment Redis token counter for user {}: {}", userId, e.getMessage());
        }

        return saved;
    }

    @Override
    public long getDailyTokenUsage(Long userId) {
        try {
            String redisKey = REDIS_TOKEN_PREFIX + userId + ":" + LocalDate.now(ZoneOffset.UTC);
            String val = redisTemplate.opsForValue().get(redisKey);
            if (val != null) {
                return Long.parseLong(val);
            }
        } catch (Exception e) {
            log.debug("Redis token counter miss for user {}: {}", userId, e.getMessage());
        }

        Instant startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        return usageLogRepository.sumTokensByUserIdSince(userId, startOfDay);
    }

    @Override
    public long getDailyCompanyTokenUsage(Long companyId) {
        Instant startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        return usageLogRepository.sumTokensByCompanyIdSince(companyId, startOfDay);
    }

    @Override
    public boolean isDailyQuotaExceeded(Long userId, int dailyLimit) {
        if (dailyLimit <= 0) return false;
        long currentUsage = getDailyTokenUsage(userId);
        return currentUsage >= dailyLimit;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AiUsageLog> getUserUsageLogs(Long userId, Pageable pageable) {
        return usageLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
}
