package com.talentiq.service.notification;

import com.talentiq.dto.notification.NotificationDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class SseNotificationService {

    // Store emitters for each user ID
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId) {
        // 30 minutes timeout
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId, emitter));
        emitter.onTimeout(() -> emitters.remove(userId, emitter));
        emitter.onError((e) -> emitters.remove(userId, emitter));

        // Send an initial dummy event to keep connection alive
        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected"));
        } catch (IOException e) {
            emitters.remove(userId, emitter);
        }

        return emitter;
    }

    public void sendNotification(Long userId, NotificationDto.Response notification) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(notification));
                log.info("Sent SSE notification to user {}", userId);
            } catch (IOException e) {
                log.warn("Failed to send SSE to user {}, removing emitter", userId);
                emitters.remove(userId, emitter);
            }
        }
    }
}
