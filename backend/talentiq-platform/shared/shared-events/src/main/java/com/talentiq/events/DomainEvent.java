package com.talentiq.events;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, property = "@class")
public abstract class DomainEvent implements Serializable {

    @lombok.Builder.Default
    private String eventId = UUID.randomUUID().toString();

    private String eventType;

    @lombok.Builder.Default
    private Instant timestamp = Instant.now();

    private String correlationId;

    private String sourceService;
}
