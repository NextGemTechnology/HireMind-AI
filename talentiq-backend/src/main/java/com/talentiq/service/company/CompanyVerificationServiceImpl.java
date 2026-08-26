package com.talentiq.service.company;

import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.company.CompanyVerificationDto;
import com.talentiq.model.Company;
import com.talentiq.model.CompanyCandidateVerification;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyCandidateVerificationRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyVerificationServiceImpl implements CompanyVerificationService {

    private final CompanyCandidateVerificationRepository verificationRepository;
    private final HrProfileRepository hrProfileRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @Override
    public CompanyVerificationDto.Response requestCandidateTag(Long hrUserId, CompanyVerificationDto.RequestTag request) {
        HrProfile hrProfile = hrProfileRepository.findById(hrUserId)
                .or(() -> hrProfileRepository.findByUserId(hrUserId))
                .orElseThrow(() -> new BadRequestException("You must have an active HR profile attached to a registered company to request candidate verification tags."));

        Company company = hrProfile.getCompany();
        if (company == null) {
            throw new BadRequestException("HR Profile is not associated with any registered company.");
        }

        User candidate = userRepository.findById(request.getCandidateUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate User", "id", request.getCandidateUserId()));

        // Prevent duplicate pending requests for the same candidate & company
        if (verificationRepository.existsByCompanyIdAndCandidateUserIdAndStatus(company.getId(), candidate.getId(), "PENDING")) {
            throw new BadRequestException("A verification request for this candidate is already pending approval from Company Leadership.");
        }

        User hrUser = hrProfile.getUser() != null ? hrProfile.getUser() : candidate;

        String certCode = "HM-" + company.getSlug().toUpperCase().replaceAll("[^A-Z0-9]", "").substring(0, Math.min(company.getSlug().length(), 6))
                + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        CompanyCandidateVerification verification = CompanyCandidateVerification.builder()
                .company(company)
                .hrUser(hrUser)
                .candidateUser(candidate)
                .jobTitle(request.getJobTitle().trim())
                .department(request.getDepartment())
                .skillsTagged(request.getSkillsTagged())
                .notes(request.getNotes())
                .status("PENDING")
                .requestedAt(Instant.now())
                .badgeCertificateId(certCode)
                .build();

        CompanyCandidateVerification saved = verificationRepository.save(verification);
        log.info("HR ID {} initiated candidate verification request ID {} for Candidate ID {} with Company ID {}",
                hrUserId, saved.getId(), candidate.getId(), company.getId());

        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CompanyVerificationDto.Response> getCompanyPendingVerifications(Long companyAdminUserId, String status, Pageable pageable) {
        HrProfile adminProfile = hrProfileRepository.findByUserId(companyAdminUserId).orElse(null);
        Long companyId = null;

        if (adminProfile != null && adminProfile.getCompany() != null) {
            companyId = adminProfile.getCompany().getId();
        } else {
            // Check if user is super admin or linked directly
            User user = userRepository.findById(companyAdminUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", companyAdminUserId));
            boolean isSuperAdmin = user.getRoles().contains(com.talentiq.common.enums.Role.ROLE_SUPER_ADMIN);
            if (!isSuperAdmin) {
                throw new ForbiddenException("Only registered company executives / administrators can view company verification queues.");
            }
        }

        Page<CompanyCandidateVerification> page;
        if (companyId != null) {
            page = verificationRepository.findByCompanyIdAndStatus(companyId, status, pageable);
        } else {
            page = verificationRepository.findAll(pageable);
        }

        return PagedResponse.of(page.map(this::mapToDto));
    }

    @Override
    public CompanyVerificationDto.Response processVerificationDecision(Long companyAdminUserId, Long verificationId, CompanyVerificationDto.ApproveRejectRequest request) {
        CompanyCandidateVerification verification = verificationRepository.findById(verificationId)
                .orElseThrow(() -> new ResourceNotFoundException("CompanyCandidateVerification", "id", verificationId));

        User adminUser = userRepository.findById(companyAdminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", companyAdminUserId));

        // Enforce Multi-tenant isolation: verify admin belongs to the same company
        HrProfile adminProfile = hrProfileRepository.findByUserId(companyAdminUserId).orElse(null);
        boolean isSuperAdmin = adminUser.getRoles().contains(com.talentiq.common.enums.Role.ROLE_SUPER_ADMIN);
        
        if (!isSuperAdmin) {
            if (adminProfile == null || adminProfile.getCompany() == null || !adminProfile.getCompany().getId().equals(verification.getCompany().getId())) {
                throw new ForbiddenException("You can only approve or reject verification requests for your own registered company.");
            }
        }

        if (request.isApproved()) {
            verification.setStatus("APPROVED");
            verification.setApprovedAt(Instant.now());
            verification.setApprovedByUser(adminUser);
            verification.setRejectionReason(null);
            log.info("Company Director ID {} APPROVED verification ID {} for Candidate ID {}",
                    companyAdminUserId, verificationId, verification.getCandidateUser().getId());
        } else {
            verification.setStatus("REJECTED");
            verification.setApprovedAt(null);
            verification.setApprovedByUser(adminUser);
            verification.setRejectionReason(request.getRejectionReason() != null ? request.getRejectionReason() : "Declined by Company Executive");
            log.info("Company Director ID {} REJECTED verification ID {} with reason: {}",
                    companyAdminUserId, verificationId, verification.getRejectionReason());
        }

        CompanyCandidateVerification saved = verificationRepository.save(verification);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyVerificationDto.Response> getCandidateApprovedBadges(Long candidateUserId) {
        return verificationRepository.findApprovedByCandidateUserId(candidateUserId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyVerificationDto.Response getVerificationByCertificate(String certificateId) {
        CompanyCandidateVerification verification = verificationRepository.findByBadgeCertificateId(certificateId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification Certificate", "id", certificateId));
        return mapToDto(verification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyVerificationDto.HrMemberResponse> getCompanyHrTeam(Long companyAdminUserId) {
        HrProfile adminProfile = hrProfileRepository.findByUserId(companyAdminUserId).orElse(null);
        Long companyId = null;

        if (adminProfile != null && adminProfile.getCompany() != null) {
            companyId = adminProfile.getCompany().getId();
        } else {
            User user = userRepository.findById(companyAdminUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", companyAdminUserId));
            boolean isSuperAdmin = user.getRoles().contains(com.talentiq.common.enums.Role.ROLE_SUPER_ADMIN);
            if (!isSuperAdmin) {
                throw new ForbiddenException("Only registered company executives / administrators can view company HR team.");
            }
        }

        List<HrProfile> hrs;
        if (companyId != null) {
            hrs = hrProfileRepository.findAllByCompanyId(companyId);
        } else {
            hrs = hrProfileRepository.findAll();
        }

        return hrs.stream().map(h -> {
            String name = h.getFullName();
            String email = h.getEmail() != null ? h.getEmail() : (h.getUser() != null ? h.getUser().getEmail() : "");
            Long uId = h.getUser() != null ? h.getUser().getId() : h.getId();
            return CompanyVerificationDto.HrMemberResponse.builder()
                    .hrProfileId(h.getId())
                    .userId(uId)
                    .name(name)
                    .email(email)
                    .designation(h.getDesignation())
                    .department(h.getDepartment())
                    .companyAdmin(h.isCompanyAdmin())
                    .companyVerified(h.isCompanyVerified())
                    .companyVerifiedTitle(h.getCompanyVerifiedTitle())
                    .companyVerifiedAt(h.getCompanyVerifiedAt())
                    .active(h.isActive())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    public CompanyVerificationDto.HrMemberResponse verifyHrRecruiter(Long companyAdminUserId, Long hrProfileId, CompanyVerificationDto.VerifyHrRequest request) {
        HrProfile targetHr = hrProfileRepository.findById(hrProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("HR Profile", "id", hrProfileId));

        HrProfile adminProfile = hrProfileRepository.findByUserId(companyAdminUserId).orElse(null);
        User adminUser = userRepository.findById(companyAdminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", companyAdminUserId));
        boolean isSuperAdmin = adminUser.getRoles().contains(com.talentiq.common.enums.Role.ROLE_SUPER_ADMIN);

        if (!isSuperAdmin) {
            if (adminProfile == null || adminProfile.getCompany() == null || targetHr.getCompany() == null || !adminProfile.getCompany().getId().equals(targetHr.getCompany().getId())) {
                throw new ForbiddenException("You can only verify HR recruiters who belong to your registered company.");
            }
        }

        targetHr.setCompanyVerified(request.isVerified());
        if (request.isVerified()) {
            targetHr.setCompanyVerifiedAt(Instant.now());
            targetHr.setCompanyVerifiedTitle(request.getBadgeTitle() != null ? request.getBadgeTitle() : "Official Verified Recruiter");
        } else {
            targetHr.setCompanyVerifiedAt(null);
            targetHr.setCompanyVerifiedTitle(null);
        }

        HrProfile saved = hrProfileRepository.save(targetHr);
        log.info("Company Admin ID {} updated HR Profile ID {} verification status to {}", companyAdminUserId, hrProfileId, saved.isCompanyVerified());

        String name = saved.getFullName();
        String email = saved.getEmail() != null ? saved.getEmail() : (saved.getUser() != null ? saved.getUser().getEmail() : "");
        Long uId = saved.getUser() != null ? saved.getUser().getId() : saved.getId();

        return CompanyVerificationDto.HrMemberResponse.builder()
                .hrProfileId(saved.getId())
                .userId(uId)
                .name(name)
                .email(email)
                .designation(saved.getDesignation())
                .department(saved.getDepartment())
                .companyAdmin(saved.isCompanyAdmin())
                .companyVerified(saved.isCompanyVerified())
                .companyVerifiedTitle(saved.getCompanyVerifiedTitle())
                .companyVerifiedAt(saved.getCompanyVerifiedAt())
                .active(saved.isActive())
                .build();
    }

    private CompanyVerificationDto.Response mapToDto(CompanyCandidateVerification v) {
        return CompanyVerificationDto.Response.builder()
                .id(v.getId())
                .companyId(v.getCompany().getId())
                .companyName(v.getCompany().getName())
                .companyLogoUrl(v.getCompany().getLogoUrl())
                .hrUserId(v.getHrUser().getId())
                .hrName(v.getHrUser().getFirstName() + " " + v.getHrUser().getLastName())
                .candidateUserId(v.getCandidateUser().getId())
                .candidateName(v.getCandidateUser().getFirstName() + " " + v.getCandidateUser().getLastName())
                .candidateEmail(v.getCandidateUser().getEmail())
                .candidateAvatarUrl(v.getCandidateUser().getAvatarUrl())
                .jobTitle(v.getJobTitle())
                .department(v.getDepartment())
                .status(v.getStatus())
                .requestedAt(v.getRequestedAt())
                .approvedAt(v.getApprovedAt())
                .approvedByName(v.getApprovedByUser() != null ? v.getApprovedByUser().getFirstName() + " " + v.getApprovedByUser().getLastName() : null)
                .rejectionReason(v.getRejectionReason())
                .badgeCertificateId(v.getBadgeCertificateId())
                .skillsTagged(v.getSkillsTagged())
                .notes(v.getNotes())
                .build();
    }
}
