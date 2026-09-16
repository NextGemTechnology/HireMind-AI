package com.talentiq.infrastructure.scheduler;

import com.talentiq.repository.auth.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Scheduled maintenance tasks.
 * Runs on a configurable schedule to keep the database clean.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MaintenanceScheduler {

    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * Purge expired and revoked refresh tokens.
     * Runs every hour. Keeps the refresh_tokens table from growing unbounded.
     */
    @Scheduled(fixedRate = 3_600_000)   // every hour in ms
    @Transactional
    public void purgeExpiredRefreshTokens() {
        int deleted = refreshTokenRepository.deleteExpiredAndRevokedTokens(Instant.now());
        if (deleted > 0) {
            log.info("Maintenance: Purged {} expired/revoked refresh tokens", deleted);
        }
    }
}
