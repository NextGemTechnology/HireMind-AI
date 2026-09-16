package com.talentiq.service.notification;

import com.talentiq.dto.notification.NotificationDto;
import com.talentiq.model.Notification;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.repository.notification.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public NotificationDto.Response sendNotification(Long recipientUserId, NotificationDto.SendRequest request) {
        User recipient = userRepository.findById(recipientUserId).orElse(null);
        if (recipient == null) {
            log.warn("Cannot send notification: User {} not found", recipientUserId);
            return null;
        }

        Notification notification = Notification.builder()
                .user(recipient)
                .title(request.getTitle())
                .message(request.getMessage())
                .type(request.getType() != null ? request.getType() : "SYSTEM_ALERT")
                .linkUrl(request.getLinkUrl())
                .read(false)
                .createdAt(Instant.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Notification saved for user ID {}: {}", recipientUserId, saved.getTitle());

        return NotificationDto.Response.builder()
                .id(saved.getId())
                .userId(recipientUserId)
                .title(saved.getTitle())
                .message(saved.getMessage())
                .type(saved.getType())
                .linkUrl(saved.getLinkUrl())
                .read(saved.isRead())
                .createdAt(saved.getCreatedAt())
                .build();
    }
}
