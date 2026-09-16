package com.talentiq.service.notification;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.notification.NotificationDto;
import com.talentiq.model.Notification;
import com.talentiq.model.User;
import com.talentiq.repository.notification.NotificationRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public NotificationDto.Response sendNotification(Long recipientUserId, NotificationDto.SendRequest request) {
        User recipient = userRepository.findById(recipientUserId).orElse(null);

        Notification notification = Notification.builder()
                .user(recipient)
                .type(request.getType() != null ? request.getType() : "MESSAGE_RECEIVED")
                .title(request.getTitle())
                .message(request.getMessage())
                .linkUrl(request.getLinkUrl())
                .read(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        NotificationDto.Response response = mapToResponse(saved);

        try {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(recipientUserId),
                    "/queue/notifications",
                    response
            );
        } catch (Exception e) {
            log.warn("Failed to dispatch WebSocket notification to user {}: {}", recipientUserId, e.getMessage());
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<NotificationDto.Response> listUserNotifications(Long userId, Pageable pageable) {
        Page<Notification> page = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
        List<NotificationDto.Response> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return PagedResponse.of("Notifications retrieved successfully", content, page);
    }

    @Override
    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser() != null && n.getUser().getId().equals(userId)) {
                n.markAsRead();
                notificationRepository.save(n);
            }
        });
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId, Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Override
    public NotificationDto.PreferencesResponse getPreferences(Long userId) {
        return NotificationDto.PreferencesResponse.builder().build();
    }

    @Override
    public NotificationDto.PreferencesResponse updatePreferences(Long userId, NotificationDto.PreferencesUpdateRequest request) {
        return NotificationDto.PreferencesResponse.builder().build();
    }

    private NotificationDto.Response mapToResponse(Notification notification) {
        return NotificationDto.Response.builder()
                .id(notification.getId())
                .userId(notification.getUser() != null ? notification.getUser().getId() : null)
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .linkUrl(notification.getLinkUrl())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
