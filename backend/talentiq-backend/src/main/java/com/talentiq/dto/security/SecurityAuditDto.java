package com.talentiq.dto.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

public class SecurityAuditDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SecurityCheckItem {
        private String checkId;
        private String name;
        private String category;
        private String status;
        private String description;
        private String details;
        private String recommendation;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuditReportResponse {
        private String overallStatus;
        private int securityScore;
        private int totalChecks;
        private int passedChecks;
        private int warningChecks;
        private int failedChecks;
        private Instant auditedAt;
        private String environment;
        private List<SecurityCheckItem> checks;
    }
}
