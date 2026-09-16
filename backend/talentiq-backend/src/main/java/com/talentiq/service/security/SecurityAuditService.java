package com.talentiq.service.security;

import com.talentiq.dto.security.SecurityAuditDto;

public interface SecurityAuditService {

    SecurityAuditDto.AuditReportResponse runComprehensiveSecurityAudit(Long adminUserId);
}
