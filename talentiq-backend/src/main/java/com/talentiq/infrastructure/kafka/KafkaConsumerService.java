package com.talentiq.infrastructure.kafka;

import com.talentiq.dto.chat.ChatMessageDto;
import com.talentiq.dto.chat.GroupChatDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Message consumer to broadcast Kafka messages to local WebSocket clients.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "talentiq.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConsumerService {

    private final SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = KafkaConfig.TOPIC_DIRECT_MESSAGES, groupId = "talentiq-chat-group")
    public void consumeDirectMessage(ChatMessageDto.MessageResponse message) {
        if (message != null && message.getReceiverId() != null) {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(message.getReceiverId()),
                    "/queue/chat",
                    message
            );
        }
    }

    @KafkaListener(topics = KafkaConfig.TOPIC_GROUP_MESSAGES, groupId = "talentiq-chat-group")
    public void consumeGroupMessage(GroupChatDto.MessageResponse message) {
        if (message != null && message.getGroupId() != null) {
            messagingTemplate.convertAndSend(
                    "/topic/group." + message.getGroupId(),
                    message
            );
        }
    }
}
