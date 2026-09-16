package com.talentiq.events;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionUpdatedEvent extends DomainEvent {

    private Long subscriptionId;
    private Long userId;
    private Long companyId;
    private Long planId;
    private String planName;
    private String status;
    private Instant startDate;
    private Instant endDate;
}
