package com.talentiq.dto.job;

import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.common.enums.JobType;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class JobSearchFilter {
    private String query;
    private String location;
    private List<JobType> jobTypes;
    private Boolean remote;
    private Boolean hybrid;
    private List<ExperienceLevel> experienceLevels;
    private BigDecimal minSalary;
    private String currency;
    private List<String> skills;
}
