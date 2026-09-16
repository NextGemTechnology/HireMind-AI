package com.talentiq.ai.service;
import com.talentiq.ai.model.*;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiResponseCacheService {

    private final StringRedisTemplate redisTemplate;

    private static final String CACHE_PREFIX = "ai:faq:";
    private static final long DEFAULT_TTL_MINUTES = 60;

    public Optional<String> getCachedResponse(String userPrompt) {
        if (userPrompt == null || userPrompt.isBlank()) return Optional.empty();
        try {
            String hash = hashPrompt(userPrompt);
            String cached = redisTemplate.opsForValue().get(CACHE_PREFIX + hash);
            return Optional.ofNullable(cached);
        } catch (Exception e) {
            log.debug("Redis cache miss or error: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public void cacheResponse(String userPrompt, String response) {
        if (userPrompt == null || response == null || response.isBlank()) return;
        try {
            String hash = hashPrompt(userPrompt);
            redisTemplate.opsForValue().set(CACHE_PREFIX + hash, response, DEFAULT_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.warn("Failed to cache AI response in Redis: {}", e.getMessage());
        }
    }

    private String hashPrompt(String prompt) {
        try {
            String normalized = prompt.trim().toLowerCase().replaceAll("\\s+", " ");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 16);
        } catch (Exception e) {
            return String.valueOf(prompt.hashCode());
        }
    }
}
