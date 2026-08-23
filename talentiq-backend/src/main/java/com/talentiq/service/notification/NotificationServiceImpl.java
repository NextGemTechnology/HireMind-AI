package com.talentiq.service.notification;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.dto.notification.NotificationDto;
import com.talentiq.model.Notification;
import com.talentiq.model.NotificationPreferences;
import com.talentiq.repository.notification.NotificationPreferencesRepository;
import com.talentiq.repository.notification.NotificationRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferencesRepository preferencesRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final SseNotificationService sseNotificationService;

    @Override
    public NotificationDto.Response sendNotification(Long recipientUserId, NotificationDto.SendRequest request) {
        User recipient = userRepository.findById(recipientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", recipientUserId));

        NotificationPreferences preferences = preferencesRepository.findByUserId(recipientUserId)
                .orElseGet(() -> NotificationPreferences.builder().user(recipient).build());

        Notification notification = Notification.builder()
                .user(recipient)
                .title(request.getTitle().trim())
                .message(request.getMessage().trim())
                .type(request.getType() != null ? request.getType().trim() : "SYSTEM_ALERT")
                .linkUrl(request.getLinkUrl())
                .build();

        Notification saved = notificationRepository.save(notification);

        // Async email dispatch if enabled in user preferences
        if (preferences.isEmailNotificationsEnabled()) {
            mailService.sendSystemAlert(recipient.getEmail(), saved.getTitle(), saved.getMessage());
        }

        NotificationDto.Response response = mapToResponse(saved);
        sseNotificationService.sendNotification(recipientUserId, response);

        log.info("Notification sent to user ID {}: {}", recipientUserId, saved.getTitle());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<NotificationDto.Response> listUserNotifications(Long userId, Pageable pageable) {
        Page<Notification> notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
        return PagedResponse.of(notifications.map(this::mapToResponse));
    }

    @Override
    public void markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You do not own this notification");
        }

        notification.markAsRead();
        notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId, Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationDto.PreferencesResponse getPreferences(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        NotificationPreferences preferences = preferencesRepository.findByUserId(userId)
                .orElseGet(() -> NotificationPreferences.builder().user(user).build());

        return mapToPreferencesResponse(preferences);
    }

    @Override
    public NotificationDto.PreferencesResponse updatePreferences(Long userId, NotificationDto.PreferencesUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        NotificationPreferences preferences = preferencesRepository.findByUserId(userId)
                .orElseGet(() -> NotificationPreferences.builder().user(user).build());

        if (request.getEmailNotificationsEnabled() != null) preferences.setEmailNotificationsEnabled(request.getEmailNotificationsEnabled());
        if (request.getInAppEnabled() != null) preferences.setInAppEnabled(request.getInAppEnabled());
        if (request.getMarketingEnabled() != null) preferences.setMarketingEnabled(request.getMarketingEnabled());
        if (request.getJobAlertsEnabled() != null) preferences.setJobAlertsEnabled(request.getJobAlertsEnabled());

        preferences.setUpdatedAt(Instant.now());
        NotificationPreferences saved = preferencesRepository.save(preferences);
        return mapToPreferencesResponse(saved);
    }

    private NotificationDto.Response mapToResponse(Notification notification) {
        return NotificationDto.Response.builder()
                .id(notification.getId())
                .userId(notification.getUser().getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .read(notification.isRead())
                .readAt(notification.getReadAt())
                .linkUrl(notification.getLinkUrl())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private NotificationDto.PreferencesResponse mapToPreferencesResponse(NotificationPreferences pref) {
        return NotificationDto.PreferencesResponse.builder()
                .id(pref.getId())
                .userId(pref.getUser().getId())
                .emailNotificationsEnabled(pref.isEmailNotificationsEnabled())
                .inAppEnabled(pref.isInAppEnabled())
                .marketingEnabled(pref.isMarketingEnabled())
                .jobAlertsEnabled(pref.isJobAlertsEnabled())
                .build();
    }
}
