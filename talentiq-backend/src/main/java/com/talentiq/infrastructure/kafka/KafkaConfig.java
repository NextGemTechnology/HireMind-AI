package com.talentiq.infrastructure.kafka;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Distributed Kafka message broker configuration for chat load balancing.
 */
@Configuration
@EnableKafka
@ConditionalOnProperty(name = "talentiq.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConfig {

    public static final String TOPIC_DIRECT_MESSAGES = "talentiq.chat.direct";
    public static final String TOPIC_GROUP_MESSAGES = "talentiq.chat.group";
    public static final String TOPIC_CHAT_NOTIFICATIONS = "talentiq.chat.notifications";

    @Bean
    public NewTopic directMessagesTopic() {
        return TopicBuilder.name(TOPIC_DIRECT_MESSAGES)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic groupMessagesTopic() {
        return TopicBuilder.name(TOPIC_GROUP_MESSAGES)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic chatNotificationsTopic() {
        return TopicBuilder.name(TOPIC_CHAT_NOTIFICATIONS)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
