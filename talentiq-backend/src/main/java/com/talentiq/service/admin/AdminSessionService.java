package com.talentiq.service.admin;

import com.talentiq.model.AdminSession;

import java.util.Optional;

public interface AdminSessionService {

    AdminSession createSession(Long userId, String deviceInfo, String ipAddress, boolean mfaVerified);

    boolean validateSession(Long userId, String sessionToken);

    void recordActivity(String sessionToken);

    void terminateSession(String sessionToken);

    void terminateAllUserSessions(Long userId);

    Optional<AdminSession> getActiveSession(Long userId);

    boolean hasConflictingActiveSession(Long userId);
}
