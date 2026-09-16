package com.talentiq.infrastructure.kafka;

import com.talentiq.dto.chat.ChatMessageDto;
import com.talentiq.dto.chat.GroupChatDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * Message producer for distributed load balancing across backend replicas.
 * Asynchronously delivers messages to Kafka so HTTP threads never block if broker is offline.
 */
@Service
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public KafkaProducerService(@Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishDirectMessage(ChatMessageDto.MessageResponse message) {
        if (kafkaTemplate != null) {
            CompletableFuture.runAsync(() -> {
                try {
                    kafkaTemplate.send(KafkaConfig.TOPIC_DIRECT_MESSAGES, String.valueOf(message.getReceiverId()), message);
                    log.debug("Published direct message to Kafka topic: {}", KafkaConfig.TOPIC_DIRECT_MESSAGES);
                } catch (Exception e) {
                    log.warn("Kafka publish direct message fallback: {}", e.getMessage());
                }
            });
        }
    }

    public void publishGroupMessage(Long groupId, GroupChatDto.MessageResponse message) {
        if (kafkaTemplate != null) {
            CompletableFuture.runAsync(() -> {
                try {
                    kafkaTemplate.send(KafkaConfig.TOPIC_GROUP_MESSAGES, String.valueOf(groupId), message);
                    log.debug("Published group message to Kafka topic: {}", KafkaConfig.TOPIC_GROUP_MESSAGES);
                } catch (Exception e) {
                    log.warn("Kafka publish group message fallback: {}", e.getMessage());
                }
            });
        }
    }
}
