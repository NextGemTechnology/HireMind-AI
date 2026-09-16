package com.talentiq.service.notification;

import com.talentiq.dto.notification.NotificationDto;

public interface NotificationService {
    NotificationDto.Response sendNotification(Long recipientUserId, NotificationDto.SendRequest request);
}
