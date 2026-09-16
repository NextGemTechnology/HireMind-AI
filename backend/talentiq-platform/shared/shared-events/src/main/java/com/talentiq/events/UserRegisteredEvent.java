package com.talentiq.events;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class UserRegisteredEvent extends DomainEvent {

    private Long userId;
    private String email;
    private String role;
    private String fullName;
    private Long companyId;
}
