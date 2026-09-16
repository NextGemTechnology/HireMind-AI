package com.talentiq.service.admin;

import com.talentiq.model.AdminSession;
import com.talentiq.repository.admin.AdminSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminSessionServiceImpl implements AdminSessionService {

    private final AdminSessionRepository adminSessionRepository;
    private final StringRedisTemplate redisTemplate;

    private static final String REDIS_SESSION_PREFIX = "admin:session:";
    private static final long SESSION_TTL_HOURS = 4;

    @Override
    @Transactional
    public AdminSession createSession(Long userId, String deviceInfo, String ipAddress, boolean mfaVerified) {
        // Deactivate existing sessions if any
        terminateAllUserSessions(userId);

        String sessionToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        Instant now = Instant.now();
        Instant expiresAt = now.plus(SESSION_TTL_HOURS, ChronoUnit.HOURS);

        AdminSession session = AdminSession.builder()
                .userId(userId)
                .sessionToken(sessionToken)
                .deviceInfo(deviceInfo != null ? deviceInfo : "Unknown Device")
                .ipAddress(ipAddress != null ? ipAddress : "0.0.0.0")
                .active(true)
                .mfaVerified(mfaVerified)
                .createdAt(now)
                .lastActivityAt(now)
                .expiresAt(expiresAt)
                .build();

        AdminSession saved = adminSessionRepository.save(session);

        // Cache in Redis for high-throughput validation
        try {
            String redisKey = REDIS_SESSION_PREFIX + userId;
            redisTemplate.opsForValue().set(redisKey, sessionToken, Duration.ofHours(SESSION_TTL_HOURS));
        } catch (Exception ex) {
            log.warn("Failed to set Redis session cache for user: {}", userId, ex);
        }

        return saved;
    }

    @Override
    public boolean validateSession(Long userId, String sessionToken) {
        if (userId == null || sessionToken == null) return false;

        try {
            String redisKey = REDIS_SESSION_PREFIX + userId;
            String cachedToken = redisTemplate.opsForValue().get(redisKey);
            if (cachedToken != null) {
                return cachedToken.equals(sessionToken);
            }
        } catch (Exception ex) {
            log.warn("Redis session validation fallback to DB for user: {}", userId);
        }

        // DB Fallback
        Optional<AdminSession> sessionOpt = adminSessionRepository.findBySessionToken(sessionToken);
        return sessionOpt.isPresent() && sessionOpt.get().isActive() && !sessionOpt.get().isExpired() && sessionOpt.get().getUserId().equals(userId);
    }

    @Override
    @Transactional
    public void recordActivity(String sessionToken) {
        if (sessionToken == null) return;
        try {
            adminSessionRepository.updateLastActivity(sessionToken, Instant.now());
        } catch (Exception ex) {
            log.debug("Failed to record session activity: {}", ex.getMessage());
        }
    }

    @Override
    @Transactional
    public void terminateSession(String sessionToken) {
        if (sessionToken == null) return;
        adminSessionRepository.findBySessionToken(sessionToken).ifPresent(session -> {
            session.setActive(false);
            adminSessionRepository.save(session);
            try {
                String redisKey = REDIS_SESSION_PREFIX + session.getUserId();
                redisTemplate.delete(redisKey);
            } catch (Exception ex) {
                log.warn("Failed to delete Redis session for user: {}", session.getUserId());
            }
        });
    }

    @Override
    @Transactional
    public void terminateAllUserSessions(Long userId) {
        if (userId == null) return;
        adminSessionRepository.deactivateAllUserSessions(userId);
        try {
            String redisKey = REDIS_SESSION_PREFIX + userId;
            redisTemplate.delete(redisKey);
        } catch (Exception ex) {
            log.warn("Failed to delete Redis session key for user: {}", userId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AdminSession> getActiveSession(Long userId) {
        List<AdminSession> activeSessions = adminSessionRepository.findByUserIdAndActiveTrue(userId);
        return activeSessions.stream().filter(s -> !s.isExpired()).findFirst();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasConflictingActiveSession(Long userId) {
        try {
            String redisKey = REDIS_SESSION_PREFIX + userId;
            Boolean hasKey = redisTemplate.hasKey(redisKey);
            if (Boolean.TRUE.equals(hasKey)) return true;
        } catch (Exception ex) {
            log.warn("Redis error checking active session: {}", ex.getMessage());
        }
        return adminSessionRepository.countByUserIdAndActiveTrue(userId) > 0;
    }
}
