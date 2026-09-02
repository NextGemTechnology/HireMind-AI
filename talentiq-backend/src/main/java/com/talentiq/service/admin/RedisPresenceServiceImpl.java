package com.talentiq.service.admin;

import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisPresenceServiceImpl implements RedisPresenceService {

    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;
    private final HrProfileRepository hrProfileRepository;

    private static final String PRESENCE_PREFIX = "presence:";
    private static final Duration PRESENCE_TTL = Duration.ofMinutes(5);

    @Override
    public void recordHeartbeat(Long userId, String role) {
        if (userId == null) return;
        try {
            String roleTag = role != null ? role : "ROLE_CANDIDATE";
            String key = PRESENCE_PREFIX + userId;
            redisTemplate.opsForValue().set(key, roleTag, PRESENCE_TTL);
            updateDbLastSeen(userId);
        } catch (Exception ex) {
            log.debug("Redis presence record error: {}", ex.getMessage());
        }
    }

    @Async
    public void updateDbLastSeen(Long userId) {
        try {
            userRepository.findById(userId).ifPresent(user -> {
                user.setLastSeenAt(Instant.now());
                userRepository.save(user);
            });
        } catch (Exception ex) {
            log.debug("Async lastSeen update skipped for user {}: {}", userId, ex.getMessage());
        }
    }

    @Override
    public boolean isOnline(Long userId) {
        if (userId == null) return false;
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(PRESENCE_PREFIX + userId));
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public long getOnlineUserCount() {
        return scanPresenceCountByRole(null);
    }

    @Override
    public long getOnlineHrCount() {
        return scanPresenceCountByRole("ROLE_HR");
    }

    @Override
    public long getOnlineCountByRole(String role) {
        return scanPresenceCountByRole(role);
    }

    @Override
    public void setOffline(Long userId) {
        if (userId == null) return;
        try {
            redisTemplate.delete(PRESENCE_PREFIX + userId);
        } catch (Exception ex) {
            log.debug("Error removing presence for user: {}", userId);
        }
    }

    @Override
    public Map<String, Object> getPresenceSummary() {
        Map<String, Object> summary = new HashMap<>();

        long totalUsers = userRepository.count();
        long totalHrs = hrProfileRepository.count();

        long onlineHrs = getOnlineHrCount();
        long onlineUsers = getOnlineUserCount();

        long onlineCandidates = Math.max(0, onlineUsers - onlineHrs);
        long totalCandidates = Math.max(0, totalUsers - totalHrs);

        summary.put("totalUsers", totalUsers);
        summary.put("onlineUsers", onlineUsers);
        summary.put("offlineUsers", Math.max(0, totalUsers - onlineUsers));

        summary.put("totalHr", totalHrs);
        summary.put("onlineHr", onlineHrs);
        summary.put("offlineHr", Math.max(0, totalHrs - onlineHrs));

        summary.put("totalCandidates", totalCandidates);
        summary.put("onlineCandidates", onlineCandidates);
        summary.put("offlineCandidates", Math.max(0, totalCandidates - onlineCandidates));

        return summary;
    }

    private long scanPresenceCountByRole(String targetRole) {
        long count = 0;
        try {
            ScanOptions options = ScanOptions.scanOptions().match(PRESENCE_PREFIX + "*").count(100).build();
            Cursor<byte[]> cursor = redisTemplate.getConnectionFactory().getConnection().scan(options);
            while (cursor.hasNext()) {
                String key = new String(cursor.next());
                if (targetRole == null) {
                    count++;
                } else {
                    String role = redisTemplate.opsForValue().get(key);
                    if (targetRole.equalsIgnoreCase(role)) {
                        count++;
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Redis scan error for presence: {}", ex.getMessage());
        }
        return count;
    }
}
