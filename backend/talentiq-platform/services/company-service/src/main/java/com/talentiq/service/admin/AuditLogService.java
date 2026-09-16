package com.talentiq.service.admin;

import com.talentiq.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.Map;

public interface AuditLogService {

    AuditLog record(Long actorUserId, String actorEmail, String action, String resourceType,
                     Long resourceId, String detailsJson, String ipAddress, String userAgent,
                     String sessionId, String result);

    AuditLog recordSuccess(Long actorUserId, String actorEmail, String action, String resourceType,
                           Long resourceId, String detailsJson, String ipAddress);

    AuditLog recordFailure(Long actorUserId, String actorEmail, String action, String resourceType,
                           Long resourceId, String errorDetails, String ipAddress);

    Page<AuditLog> getLogs(Pageable pageable);

    Page<AuditLog> getLogsByUser(Long actorUserId, Pageable pageable);

    Page<AuditLog> getLogsByAction(String action, Pageable pageable);

    Page<AuditLog> getLogsByDateRange(Instant from, Instant to, Pageable pageable);

    Map<String, Object> getAuditStats();
}
