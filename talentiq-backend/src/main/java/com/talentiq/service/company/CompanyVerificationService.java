package com.talentiq.service.company;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.company.CompanyVerificationDto;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CompanyVerificationService {

    CompanyVerificationDto.Response requestCandidateTag(Long hrUserId, CompanyVerificationDto.RequestTag request);

    PagedResponse<CompanyVerificationDto.Response> getCompanyPendingVerifications(Long companyAdminUserId, String status, Pageable pageable);

    CompanyVerificationDto.Response processVerificationDecision(Long companyAdminUserId, Long verificationId, CompanyVerificationDto.ApproveRejectRequest request);

    List<CompanyVerificationDto.Response> getCandidateApprovedBadges(Long candidateUserId);

    List<CompanyVerificationDto.Response> getCandidateBadges(Long candidateUserId);

    CompanyVerificationDto.Response getVerificationByCertificate(String certificateId);

    List<CompanyVerificationDto.HrMemberResponse> getCompanyHrTeam(Long companyAdminUserId);

    CompanyVerificationDto.HrMemberResponse verifyHrRecruiter(Long companyAdminUserId, Long hrProfileId, CompanyVerificationDto.VerifyHrRequest request);
}
