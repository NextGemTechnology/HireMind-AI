package com.talentiq.service.company;

import com.talentiq.dto.company.CompanyInvitationDto;
import com.talentiq.model.User;

import java.util.List;

public interface CompanyInvitationService {
    CompanyInvitationDto.Response createInvitation(Long companyManagerUserId, CompanyInvitationDto.CreateRequest request);
    List<CompanyInvitationDto.Response> listCompanyInvitations(Long companyManagerUserId);
    CompanyInvitationDto.Response resendInvitation(Long companyManagerUserId, Long invitationId);
    void revokeInvitation(Long companyManagerUserId, Long invitationId);
    CompanyInvitationDto.ValidateResponse validateInvitationToken(String token);
    CompanyInvitationDto.Response directAffiliateHr(Long companyManagerUserId, CompanyInvitationDto.DirectAffiliateHrRequest request);
    CompanyInvitationDto.Response directInviteCandidate(Long companyManagerUserId, CompanyInvitationDto.DirectCandidateInviteRequest request);
    CompanyInvitationDto.Response verifyOrRevokeHrBadge(Long companyManagerUserId, Long hrProfileId, CompanyInvitationDto.VerifyHrBadgeRequest request);
    List<User> getCandidatePool(Long companyManagerUserId);
    org.springframework.data.domain.Page<User> searchCandidatePool(Long companyManagerUserId, String search, org.springframework.data.domain.Pageable pageable);
}
