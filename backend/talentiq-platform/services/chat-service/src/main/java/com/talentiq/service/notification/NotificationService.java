package com.talentiq.service.notification;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.notification.NotificationDto;
import org.springframework.data.domain.Pageable;

public interface NotificationService {

    NotificationDto.Response sendNotification(Long recipientUserId, NotificationDto.SendRequest request);

    PagedResponse<NotificationDto.Response> listUserNotifications(Long userId, Pageable pageable);

    void markAsRead(Long userId, Long notificationId);

    void markAllAsRead(Long userId);

    long getUnreadCount(Long userId);

    NotificationDto.PreferencesResponse getPreferences(Long userId);

    NotificationDto.PreferencesResponse updatePreferences(Long userId, NotificationDto.PreferencesUpdateRequest request);
}
