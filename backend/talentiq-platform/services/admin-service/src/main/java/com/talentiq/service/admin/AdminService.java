package com.talentiq.service.admin;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.admin.AdminDto;
import com.talentiq.dto.company.CompanyDto;
import com.talentiq.dto.user.UserDto;
import org.springframework.data.domain.Pageable;

public interface AdminService {

    PagedResponse<UserDto.Response> listUsers(String search, Boolean enabled, Pageable pageable);

    UserDto.Response setUserEnabledStatus(Long adminUserId, Long targetUserId, AdminDto.UserStatusRequest request);

    PagedResponse<CompanyDto.Response> listPendingCompanies(Pageable pageable);

    CompanyDto.Response verifyCompany(Long adminUserId, Long companyId, AdminDto.CompanyVerificationRequest request);

    AdminDto.SystemMetricsResponse getSystemMetrics(Long adminUserId);

    AdminDto.TemporalJobMetricsResponse getTemporalJobMetrics(Long adminUserId);

    UserDto.Response setCandidateBlockStatus(Long adminUserId, Long candidateId, AdminDto.ModerationRequest request);

    UserDto.Response setHrBlockStatus(Long adminUserId, Long hrProfileId, AdminDto.ModerationRequest request);

    CompanyDto.Response setCompanyBlacklistStatus(Long adminUserId, Long companyId, AdminDto.ModerationRequest request);

    AdminDto.UserDetailsResponse getUserDetails(Long adminUserId, Long targetUserId);

    AdminDto.AgentQueryResponse processManagementAgentPrompt(Long adminUserId, AdminDto.AgentQueryRequest request);
}
