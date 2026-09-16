package com.talentiq.events;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.Map;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEvent extends DomainEvent {

    private String recipientEmail;
    private Long recipientUserId;
    private String title;
    private String content;
    private String notificationType;
    private Map<String, Object> metadata;
}
