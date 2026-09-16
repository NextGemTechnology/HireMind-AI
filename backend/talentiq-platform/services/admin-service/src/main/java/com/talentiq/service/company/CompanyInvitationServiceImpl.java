package com.talentiq.service.company;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.config.AppProperties;
import com.talentiq.dto.company.CompanyInvitationDto;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.model.Company;
import com.talentiq.model.CompanyInvitation;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyInvitationRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.service.admin.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyInvitationServiceImpl implements CompanyInvitationService {

    private final CompanyInvitationRepository invitationRepository;
    private final CompanyRepository companyRepository;
    private final HrProfileRepository hrProfileRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final AuditLogService auditLogService;
    private final AppProperties appProperties;
    private final CompanySecurityService companySecurityService;

    @Override
    public CompanyInvitationDto.Response createInvitation(Long companyManagerUserId, CompanyInvitationDto.CreateRequest request) {
        if (request.getRole() != Role.ROLE_HR && request.getRole() != Role.ROLE_CANDIDATE) {
            throw new BadRequestException("Company invitations can only target recruiters or candidates");
        }
        Company company = resolveCompany(companyManagerUserId);
        String cleanEmail = request.getEmail().trim().toLowerCase();

        // Check if there is already an active pending invite for this email and company
        invitationRepository.findByCompanyIdAndEmailAndStatus(company.getId(), cleanEmail, "PENDING")
                .ifPresent(existing -> {
                    if (!existing.isExpired()) {
                        throw new BadRequestException("An active invitation already exists for " + cleanEmail + ". You can resend the invitation instead.");
                    }
                    existing.setStatus("EXPIRED");
                    invitationRepository.save(existing);
                });

        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

        CompanyInvitation invitation = CompanyInvitation.builder()
                .company(company)
                .inviterUserId(companySecurityService.currentManagerActorId(companyManagerUserId).orElse(companyManagerUserId))
                .email(cleanEmail)
                .recipientName(request.getRecipientName())
                .role(request.getRole() != null ? request.getRole() : Role.ROLE_HR)
                .designation(StringUtils.hasText(request.getDesignation()) ? request.getDesignation().trim() : (request.getRole() == Role.ROLE_HR ? "Senior Talent Recruiter" : "Candidate"))
                .inviteToken(token)
                .status("PENDING")
                .autoVerifyBadge(request.isAutoVerifyBadge())
                .expiresAt(expiresAt)
                .build();

        CompanyInvitation saved = invitationRepository.save(invitation);
        String inviteLink = buildInviteLink(token, saved.getRole());

        // Dispatch Email Invitation
        mailService.sendCompanyInvitationEmail(
                cleanEmail,
                request.getRecipientName(),
                company.getName(),
                saved.getRole().name(),
                saved.getDesignation(),
                inviteLink,
                saved.isAutoVerifyBadge()
        );

        auditLogService.recordSuccess(
                companyManagerUserId,
                null,
                "COMPANY_INVITATION_SENT",
                "CompanyInvitation",
                saved.getId(),
                "{\"companyId\":" + company.getId() + ",\"email\":\"" + cleanEmail + "\",\"role\":\"" + saved.getRole() + "\"}",
                null
        );

        log.info("Company ID {} issued invitation ID {} as {}", company.getId(), saved.getId(), saved.getRole());
        return mapToResponse(saved, inviteLink);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyInvitationDto.Response> listCompanyInvitations(Long companyManagerUserId) {
        Company company = resolveCompany(companyManagerUserId);
        List<CompanyInvitation> invites = invitationRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());

        return invites.stream()
                .map(i -> mapToResponse(i, buildInviteLink(i.getInviteToken(), i.getRole())))
                .collect(Collectors.toList());
    }

    @Override
    public CompanyInvitationDto.Response resendInvitation(Long companyManagerUserId, Long invitationId) {
        Company company = resolveCompany(companyManagerUserId);
        CompanyInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("CompanyInvitation", "id", invitationId));

        if (!invitation.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Cannot resend an invitation belonging to another company.");
        }

        invitation.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        invitation.setStatus("PENDING");
        CompanyInvitation updated = invitationRepository.save(invitation);

        String inviteLink = buildInviteLink(updated.getInviteToken(), updated.getRole());
        mailService.sendCompanyInvitationEmail(
                updated.getEmail(),
                updated.getRecipientName(),
                company.getName(),
                updated.getRole().name(),
                updated.getDesignation(),
                inviteLink,
                updated.isAutoVerifyBadge()
        );

        log.info("Company ID {} resent invitation ID {} to {}", company.getId(), invitationId, updated.getEmail());
        return mapToResponse(updated, inviteLink);
    }

    @Override
    public void revokeInvitation(Long companyManagerUserId, Long invitationId) {
        Company company = resolveCompany(companyManagerUserId);
        CompanyInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("CompanyInvitation", "id", invitationId));

        if (!invitation.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Cannot revoke an invitation belonging to another company.");
        }

        invitation.setStatus("REVOKED");
        invitationRepository.save(invitation);
        log.info("Company ID {} revoked invitation ID {}", company.getId(), invitationId);
    }

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
                    .companyName(invite.getCompany().getName())
                    .message("This invitation has expired. Please contact the company administrator for a new invite link.")
                    .build();
        }

        if ("ACCEPTED".equalsIgnoreCase(invite.getStatus())) {
            return CompanyInvitationDto.ValidateResponse.builder()
                    .valid(false)
                    .companyName(invite.getCompany().getName())
                    .message("This invitation has already been accepted.")
                    .build();
        }

        if ("REVOKED".equalsIgnoreCase(invite.getStatus())) {
            return CompanyInvitationDto.ValidateResponse.builder()
                    .valid(false)
                    .companyName(invite.getCompany().getName())
                    .message("This invitation was revoked by the company administrator.")
                    .build();
        }

        return CompanyInvitationDto.ValidateResponse.builder()
                .valid(true)
                .companyId(invite.getCompany().getId())
                .companyName(invite.getCompany().getName())
                .companySlug(invite.getCompany().getSlug())
                .email(invite.getEmail())
                .role(invite.getRole().name())
                .designation(invite.getDesignation())
                .autoVerifyBadge(invite.isAutoVerifyBadge())
                .message("Valid invitation from " + invite.getCompany().getName())
                .build();
    }

    @Override
    public CompanyInvitationDto.Response directAffiliateHr(Long companyManagerUserId, CompanyInvitationDto.DirectAffiliateHrRequest request) {
        Company company = resolveCompany(companyManagerUserId);
        String cleanEmail = request.getEmail().trim().toLowerCase();

        // 1. Check if HR Profile exists
        HrProfile existingHr = hrProfileRepository.findByEmail(cleanEmail).orElse(null);
        if (existingHr != null) {
            // Strict Single Active Badge Enforcement
            if (existingHr.isCompanyVerified() && existingHr.getCompany() != null && !existingHr.getCompany().getId().equals(company.getId())) {
                throw new ConflictException("HR recruiter " + existingHr.getFullName() + " (" + cleanEmail
                        + ") already holds an active corporate verification badge with " + existingHr.getCompany().getName()
                        + ". An HR recruiter can hold only one active company verification badge at a time. The existing badge must be revoked before joining another company.");
            }

            existingHr.setCompany(company);
            if (StringUtils.hasText(request.getDesignation())) {
                existingHr.setDesignation(request.getDesignation().trim());
            }
            if (request.isAutoVerifyBadge()) {
                existingHr.setCompanyVerified(true);
                existingHr.setCompanyVerifiedAt(Instant.now());
                existingHr.setCompanyVerifiedTitle(StringUtils.hasText(request.getDesignation()) ? request.getDesignation().trim() : "Verified Talent Partner");
            }
            hrProfileRepository.save(existingHr);

            log.info("Company ID {} directly affiliated existing HR ID {} ({})", company.getId(), existingHr.getId(), cleanEmail);
            return CompanyInvitationDto.Response.builder()
                    .companyId(company.getId())
                    .companyName(company.getName())
                    .companySlug(company.getSlug())
                    .email(cleanEmail)
                    .recipientName(existingHr.getFullName())
                    .role("ROLE_HR")
                    .designation(existingHr.getDesignation())
                    .status("ACCEPTED")
                    .autoVerifyBadge(existingHr.isCompanyVerified())
                    .createdAt(Instant.now())
                    .acceptedAt(Instant.now())
                    .build();
        }

        // 2. If not registered, generate invitation and dispatch email
        CompanyInvitationDto.CreateRequest createReq = CompanyInvitationDto.CreateRequest.builder()
                .email(cleanEmail)
                .role(Role.ROLE_HR)
                .designation(request.getDesignation())
                .autoVerifyBadge(request.isAutoVerifyBadge())
                .build();

        return createInvitation(companyManagerUserId, createReq);
    }

    @Override
    public CompanyInvitationDto.Response directInviteCandidate(Long companyManagerUserId, CompanyInvitationDto.DirectCandidateInviteRequest request) {
        CompanyInvitationDto.CreateRequest createReq = CompanyInvitationDto.CreateRequest.builder()
                .email(request.getEmail())
                .recipientName(request.getCandidateName())
                .role(Role.ROLE_CANDIDATE)
                .designation(request.getProposedJobTitle())
                .autoVerifyBadge(true)
                .build();

        return createInvitation(companyManagerUserId, createReq);
    }

    @Override
    public CompanyInvitationDto.Response verifyOrRevokeHrBadge(Long companyManagerUserId, Long hrProfileId, CompanyInvitationDto.VerifyHrBadgeRequest request) {
        Company company = resolveCompany(companyManagerUserId);
        HrProfile hr = hrProfileRepository.findById(hrProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("HrProfile", "id", hrProfileId));

        if (!hr.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Cannot modify verification badges for HR outside your company.");
        }

        if (request.isVerified()) {
            // Single active badge validation
            if (hr.isCompanyVerified() && hr.getCompany() != null && !hr.getCompany().getId().equals(company.getId())) {
                throw new ConflictException("HR recruiter already holds an active corporate verification badge with another company.");
            }
            hr.setCompanyVerified(true);
            hr.setCompanyVerifiedAt(Instant.now());
            hr.setCompanyVerifiedTitle(StringUtils.hasText(request.getBadgeTitle()) ? request.getBadgeTitle().trim() : "Official Verified Recruiter");
        } else {
            hr.setCompanyVerified(false);
            hr.setCompanyVerifiedAt(null);
            hr.setCompanyVerifiedTitle(null);
        }

        HrProfile saved = hrProfileRepository.save(hr);
        log.info("Company ID {} updated HR ID {} badge verification status to {}", company.getId(), hrProfileId, saved.isCompanyVerified());

        return CompanyInvitationDto.Response.builder()
                .companyId(company.getId())
                .companyName(company.getName())
                .companySlug(company.getSlug())
                .email(saved.getEmail())
                .recipientName(saved.getFullName())
                .role("ROLE_HR")
                .designation(saved.getDesignation())
                .status("ACCEPTED")
                .autoVerifyBadge(saved.isCompanyVerified())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> getCandidatePool(Long companyManagerUserId) {
        return searchCandidatePool(companyManagerUserId, "", org.springframework.data.domain.PageRequest.of(0, 50)).getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<User> searchCandidatePool(Long companyManagerUserId, String search, org.springframework.data.domain.Pageable pageable) {
        resolveCompany(companyManagerUserId);
        return userRepository.findActiveCandidates(Role.ROLE_CANDIDATE, com.talentiq.common.enums.UserStatus.ACTIVE,
                search == null ? "" : search.trim(), pageable);
    }

    // ── Helper Methods ──

    private Company resolveCompany(Long userId) {
        var managerCompany = companySecurityService.currentManagerCompany(userId);
        if (managerCompany.isPresent()) return managerCompany.get();
        // 1. Direct HrProfile ID lookup (HR credentials map principal.getId() to hrProfile.getId())
        HrProfile hr = hrProfileRepository.findById(userId).orElse(null);
        if (hr != null && hr.getCompany() != null) {
            return hr.getCompany();
        }

        // 2. Lookup by HrProfile.user.id
        hr = hrProfileRepository.findByUserId(userId).orElse(null);
        if (hr != null && hr.getCompany() != null) {
            return hr.getCompany();
        }

        // 3. User entity lookup
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            // Check if user has an HR profile matching their email
            hr = hrProfileRepository.findByEmail(user.getEmail()).orElse(null);
            if (hr != null && hr.getCompany() != null) {
                return hr.getCompany();
            }

            Company company = companyRepository.findAll().stream()
                    .filter(c -> user.getEmail().equalsIgnoreCase(c.getEmail()) || (c.getRegisteredByUserId() != null && c.getRegisteredByUserId().equals(userId)))
                    .findFirst()
                    .orElse(null);

            if (company != null) {
                return company;
            }

            if (user.getRoles().contains(Role.ROLE_SUPER_ADMIN)) {
                return companyRepository.findAll().stream().filter(Company::isActive).findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("Company", "id", "any"));
            }

            throw new ForbiddenException("No registered corporate workspace found for user: " + user.getEmail());
        }

        // 4. In case the userId was an HrProfile without a user entity
        if (hr != null) {
            throw new ForbiddenException("HR profile " + hr.getEmail() + " is not associated with any company.");
        }

        throw new ResourceNotFoundException("User", "id", userId);
    }

    private String buildInviteLink(String token, Role role) {
        String base = appProperties.getFrontend().getBaseUrl();
        if (!StringUtils.hasText(base)) {
            base = "http://localhost:5173";
        }
        String roleParam = (role == Role.ROLE_HR) ? "HR" : "CANDIDATE";
        return base + (role == Role.ROLE_HR ? "/hr-login" : "/user-login") + "?companyInvite=" + token + "&role=" + roleParam;
    }

    private CompanyInvitationDto.Response mapToResponse(CompanyInvitation i, String inviteLink) {
        return CompanyInvitationDto.Response.builder()
                .id(i.getId())
                .companyId(i.getCompany().getId())
                .companyName(i.getCompany().getName())
                .companySlug(i.getCompany().getSlug())
                .email(i.getEmail())
                .recipientName(i.getRecipientName())
                .role(i.getRole().name())
                .designation(i.getDesignation())
                .inviteToken(i.getInviteToken())
                .inviteLink(inviteLink)
                .status(i.getStatus())
                .autoVerifyBadge(i.isAutoVerifyBadge())
                .expiresAt(i.getExpiresAt())
                .acceptedAt(i.getAcceptedAt())
                .createdAt(i.getCreatedAt())
                .build();
    }
}
