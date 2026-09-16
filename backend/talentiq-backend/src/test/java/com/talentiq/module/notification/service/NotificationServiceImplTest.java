package com.talentiq.service.notification;

import com.talentiq.common.enums.Role;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.dto.notification.NotificationDto;
import com.talentiq.model.Notification;
import com.talentiq.model.NotificationPreferences;
import com.talentiq.repository.notification.NotificationPreferencesRepository;
import com.talentiq.repository.notification.NotificationRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService Unit Tests")
class NotificationServiceImplTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationPreferencesRepository preferencesRepository;
    @Mock private UserRepository userRepository;
    @Mock private MailService mailService;
    @Mock private SseNotificationService sseNotificationService;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private User recipientUser;
    private NotificationDto.SendRequest sendReq;

    @BeforeEach
    void setUp() {
        recipientUser = User.builder()
                .id(1L)
                .email("user@example.com")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .build();

        sendReq = new NotificationDto.SendRequest();
        sendReq.setTitle("Application Stage Updated");
        sendReq.setMessage("Your application status changed to INTERVIEWING");
        sendReq.setType("APPLICATION_STATUS");
    }

    @Test
    @DisplayName("should send in-app notification and trigger email dispatch if enabled")
    void shouldSendNotificationAndTriggerEmail() {
        NotificationPreferences prefs = NotificationPreferences.builder()
                .user(recipientUser)
                .emailNotificationsEnabled(true)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(recipientUser));
        when(preferencesRepository.findByUserId(1L)).thenReturn(Optional.of(prefs));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> {
            Notification n = i.getArgument(0);
            n.setId(100L);
            return n;
        });

        NotificationDto.Response response = notificationService.sendNotification(1L, sendReq);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getTitle()).isEqualTo("Application Stage Updated");

        verify(notificationRepository).save(any(Notification.class));
        verify(mailService).sendSystemAlert(eq("user@example.com"), eq("Application Stage Updated"), any());
    }

    @Test
    @DisplayName("should fetch unread notification count correctly")
    void shouldGetUnreadCountSuccessfully() {
        when(notificationRepository.countByUserIdAndReadFalse(1L)).thenReturn(5L);

        long count = notificationService.getUnreadCount(1L);

        assertThat(count).isEqualTo(5L);
        verify(notificationRepository).countByUserIdAndReadFalse(1L);
    }
}
