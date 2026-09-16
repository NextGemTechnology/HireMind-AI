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
public class JobApplicationEvent extends DomainEvent {

    private Long applicationId;
    private Long jobId;
    private Long candidateId;
    private Long companyId;
    private String status;
}
