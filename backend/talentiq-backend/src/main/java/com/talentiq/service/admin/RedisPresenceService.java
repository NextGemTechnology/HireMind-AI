package com.talentiq.service.admin;

import java.util.Map;

public interface RedisPresenceService {

    void recordHeartbeat(Long userId, String role);

    boolean isOnline(Long userId);

    long getOnlineUserCount();

    long getOnlineHrCount();

    long getOnlineCountByRole(String role);

    void setOffline(Long userId);

    Map<String, Object> getPresenceSummary();
}
