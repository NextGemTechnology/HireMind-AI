package com.talentiq.service.company;

import com.talentiq.dto.company.CompanyInvitationDto;
import com.talentiq.model.CompanyInvitation;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyInvitationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyInvitationServiceImpl implements CompanyInvitationService {

    private final CompanyInvitationRepository invitationRepository;

    @Override
    @Transactional(readOnly = true)
    public CompanyInvitationDto.ValidateResponse validateInvitationToken(String token) {
        if (!StringUtils.hasText(token)) {
            return CompanyInvitationDto.ValidateResponse.builder()
                    .valid(false)
                    .message("Invitation token is missing or empty.")
                    .build();
        }

        CompanyInvitation invite = invitationRepository.findByInviteToken(token.trim()).orElse(null);
        if (invite == null) {
            return CompanyInvitationDto.ValidateResponse.builder()
                    .valid(false)
                    .message("Invitation not found. Please check your link or request a new invitation.")
                    .build();
        }

        if (invite.isExpired()) {
            return CompanyInvitationDto.ValidateResponse.builder()
                    .valid(false)
                    .companyName(invite.getCompany() != null ? invite.getCompany().getName() : null)
                    .message("This invitation has expired. Please contact the company administrator for a new invite link.")
                    .build();
        }

        if ("ACCEPTED".equalsIgnoreCase(invite.getStatus())) {
            return CompanyInvitationDto.ValidateResponse.builder()
                    .valid(false)
                    .companyName(invite.getCompany() != null ? invite.getCompany().getName() : null)
                    .message("This invitation has already been accepted.")
                    .build();
        }

        if ("REVOKED".equalsIgnoreCase(invite.getStatus())) {
            return CompanyInvitationDto.ValidateResponse.builder()
                    .valid(false)
                    .companyName(invite.getCompany() != null ? invite.getCompany().getName() : null)
                    .message("This invitation has been revoked by the company.")
                    .build();
        }

        return CompanyInvitationDto.ValidateResponse.builder()
                .valid(true)
                .email(invite.getEmail())
                .role(invite.getRole() != null ? invite.getRole().name() : null)
                .designation(invite.getDesignation())
                .companyId(invite.getCompany() != null ? invite.getCompany().getId() : null)
                .companyName(invite.getCompany() != null ? invite.getCompany().getName() : null)
                .companySlug(invite.getCompany() != null ? invite.getCompany().getSlug() : null)
                .autoVerifyBadge(invite.isAutoVerifyBadge())
                .message("Valid invitation from " + (invite.getCompany() != null ? invite.getCompany().getName() : "company"))
                .build();
    }

    @Override
    public CompanyInvitationDto.Response createInvitation(Long companyManagerUserId, CompanyInvitationDto.CreateRequest request) {
        throw new UnsupportedOperationException("Invitation creation is handled by company-service");
    }

    @Override
    public List<CompanyInvitationDto.Response> listCompanyInvitations(Long companyManagerUserId) {
        throw new UnsupportedOperationException("Invitation listing is handled by company-service");
    }

    @Override
    public CompanyInvitationDto.Response resendInvitation(Long companyManagerUserId, Long invitationId) {
        throw new UnsupportedOperationException("Invitation resend is handled by company-service");
    }

    @Override
    public void revokeInvitation(Long companyManagerUserId, Long invitationId) {
        throw new UnsupportedOperationException("Invitation revocation is handled by company-service");
    }

    @Override
    public CompanyInvitationDto.Response directAffiliateHr(Long companyManagerUserId, CompanyInvitationDto.DirectAffiliateHrRequest request) {
        throw new UnsupportedOperationException("Direct affiliation is handled by company-service");
    }

    @Override
    public CompanyInvitationDto.Response directInviteCandidate(Long companyManagerUserId, CompanyInvitationDto.DirectCandidateInviteRequest request) {
        throw new UnsupportedOperationException("Direct candidate invite is handled by company-service");
    }

    @Override
    public CompanyInvitationDto.Response verifyOrRevokeHrBadge(Long companyManagerUserId, Long hrProfileId, CompanyInvitationDto.VerifyHrBadgeRequest request) {
        throw new UnsupportedOperationException("HR badge verification is handled by company-service");
    }

    @Override
    public List<User> getCandidatePool(Long companyManagerUserId) {
        throw new UnsupportedOperationException("Candidate pool is handled by candidate-service");
    }

    @Override
    public Page<User> searchCandidatePool(Long companyManagerUserId, String search, Pageable pageable) {
        throw new UnsupportedOperationException("Candidate pool search is handled by candidate-service");
    }
}
