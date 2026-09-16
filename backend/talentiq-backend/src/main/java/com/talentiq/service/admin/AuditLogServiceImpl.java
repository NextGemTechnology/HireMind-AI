package com.talentiq.service.admin;

import com.talentiq.model.AuditLog;
import com.talentiq.repository.admin.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog record(Long actorUserId, String actorEmail, String action, String resourceType,
                           Long resourceId, String detailsJson, String ipAddress, String userAgent,
                           String sessionId, String result) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .actorUserId(actorUserId)
                    .actorEmail(actorEmail)
                    .action(action)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .details(detailsJson)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .sessionId(sessionId)
                    .result(result != null ? result : "SUCCESS")
                    .createdAt(Instant.now())
                    .build();
            return auditLogRepository.save(auditLog);
        } catch (Exception ex) {
            log.error("Failed to persist audit log for action: {} by user: {}", action, actorEmail, ex);
            return null;
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordSuccess(Long actorUserId, String actorEmail, String action, String resourceType,
                                  Long resourceId, String detailsJson, String ipAddress) {
        return record(actorUserId, actorEmail, action, resourceType, resourceId, detailsJson, ipAddress, null, null, "SUCCESS");
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordFailure(Long actorUserId, String actorEmail, String action, String resourceType,
                                  Long resourceId, String errorDetails, String ipAddress) {
        return record(actorUserId, actorEmail, action, resourceType, resourceId, errorDetails, ipAddress, null, null, "FAILURE");
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByUser(Long actorUserId, Pageable pageable) {
        return auditLogRepository.findByActorUserIdOrderByCreatedAtDesc(actorUserId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByAction(String action, Pageable pageable) {
        return auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByDateRange(Instant from, Instant to, Pageable pageable) {
        return auditLogRepository.findByDateRange(from, to, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getAuditStats() {
        Map<String, Object> stats = new HashMap<>();
        Instant past24Hours = Instant.now().minus(24, ChronoUnit.HOURS);
        stats.put("totalLogs", auditLogRepository.count());
        stats.put("logsLast24Hours", auditLogRepository.countByCreatedAtAfter(past24Hours));
        stats.put("failedActionsCount", auditLogRepository.countByResult("FAILURE"));
        stats.put("loginCount", auditLogRepository.countByAction("LOGIN"));
        return stats;
    }
}
