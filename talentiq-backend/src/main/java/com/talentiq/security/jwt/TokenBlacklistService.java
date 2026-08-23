package com.talentiq.security.jwt;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * High-performance Token Blacklist Service for instant token revocation upon logout.
 * Backed by Redis with in-memory concurrent fallback.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ConcurrentHashMap<String, Long> inMemoryBlacklist = new ConcurrentHashMap<>();
    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    /**
     * Blacklist an access token until its natural expiration time.
     */
    public void blacklistToken(String token, long remainingExpiryMs) {
        if (token == null || remainingExpiryMs <= 0) {
            return;
        }
        String key = BLACKLIST_PREFIX + token;
        try {
            redisTemplate.opsForValue().set(key, "revoked", remainingExpiryMs, TimeUnit.MILLISECONDS);
            log.info("Access token blacklisted in Redis for {} ms (instant destruction)", remainingExpiryMs);
        } catch (Exception e) {
            log.warn("Redis unavailable, blacklisting token in local memory: {}", e.getMessage());
            inMemoryBlacklist.put(token, System.currentTimeMillis() + remainingExpiryMs);
        }
    }

    /**
     * Check if a token has been revoked / destroyed.
     */
    public boolean isBlacklisted(String token) {
        if (token == null) return false;
        String key = BLACKLIST_PREFIX + token;
        try {
            Boolean exists = redisTemplate.hasKey(key);
            if (Boolean.TRUE.equals(exists)) {
                return true;
            }
        } catch (Exception e) {
            log.debug("Redis blacklist check error: {}", e.getMessage());
        }

        Long expiry = inMemoryBlacklist.get(token);
        if (expiry != null) {
            if (System.currentTimeMillis() < expiry) {
                return true;
            } else {
                inMemoryBlacklist.remove(token);
            }
        }
        return false;
    }
}
