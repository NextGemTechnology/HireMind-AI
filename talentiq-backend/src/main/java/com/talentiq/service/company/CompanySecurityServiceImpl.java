package com.talentiq.service.company;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.exception.UnauthorizedException;
import com.talentiq.model.Company;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.security.userdetails.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("companySecurityService")
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CompanySecurityServiceImpl implements CompanySecurityService {

    private final HrProfileRepository hrProfileRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @Override
    public HrProfile enforceVerifiedHrAccess(Long hrUserId, Long targetCompanyId) {
        if (hrUserId == null) {
            throw new UnauthorizedException("User is not authenticated");
        }

        HrProfile hr = hrProfileRepository.findById(hrUserId)
                .or(() -> hrProfileRepository.findByUserId(hrUserId))
                .orElseThrow(() -> new ForbiddenException("Access Denied: No active HR profile found for user ID " + hrUserId));

        if (!hr.isActive()) {
            throw new ForbiddenException("Access Denied: HR profile is currently deactivated.");
        }

        Company company = hr.getCompany();
        if (company == null) {
            throw new ForbiddenException("Access Denied: HR profile is not affiliated with any registered company.");
        }

        // Strict official verification check: Must be officially verified or designated Company Creator Admin
        if (!hr.isCompanyVerified() && !hr.isCompanyAdmin()) {
            throw new ForbiddenException("Access Denied: You are not officially verified by " + company.getName()
                    + ". You must hold an active corporate verification badge to access company data or recruitment operations.");
        }

        // Strict cross-company boundary check
        if (targetCompanyId != null && !company.getId().equals(targetCompanyId)) {
            throw new ForbiddenException("Cross-company access violation: HR recruiter is authorized only for company ID "
                    + company.getId() + " (" + company.getName() + "), not company ID " + targetCompanyId);
        }

        return hr;
    }

    @Override
    public HrProfile enforceVerifiedHrAccess(Long hrUserId) {
        return enforceVerifiedHrAccess(hrUserId, null);
    }

    @Override
    public void validateCompanyAccess(UserPrincipal principal, Long targetCompanyId) {
        if (principal == null) {
            throw new UnauthorizedException("User is not authenticated");
        }

        if (principal.getRoles().contains(Role.ROLE_SUPER_ADMIN) || principal.getRoles().contains(Role.ROLE_PLATFORM_ADMIN)) {
            return;
        }

        if (principal.getRoles().contains(Role.ROLE_COMPANY_ADMIN)) {
            Long adminCompanyId = resolveCompanyAdminCompanyId(principal.getId(), principal.getEmail());
            if (adminCompanyId == null || !adminCompanyId.equals(targetCompanyId)) {
                throw new ForbiddenException("Cross-company access violation: Company Manager cannot access or manage another company's data (Company ID: " + targetCompanyId + ")");
            }
            return;
        }

        if (principal.getRoles().contains(Role.ROLE_HR)) {
            enforceVerifiedHrAccess(principal.getId(), targetCompanyId);
            return;
        }

        throw new ForbiddenException("Access Denied: Insufficient company-level permissions for company ID " + targetCompanyId);
    }

    @Override
    public void validateSingleActiveBadge(Long hrProfileId, Long newCompanyId) {
        if (hrProfileId == null) return;

        HrProfile targetHr = hrProfileRepository.findById(hrProfileId).orElse(null);
        if (targetHr == null) return;

        // An HR recruiter can hold at most ONE active corporate verification badge at a time
        if (targetHr.isCompanyVerified() && targetHr.getCompany() != null) {
            if (newCompanyId != null && !targetHr.getCompany().getId().equals(newCompanyId)) {
                throw new ConflictException("HR recruiter " + targetHr.getFullName() + " (" + targetHr.getEmail()
                        + ") already holds an active corporate verification badge with " + targetHr.getCompany().getName()
                        + ". An HR recruiter can hold only one active company verification badge at a time. The existing badge must be revoked before verification with another company.");
            }
        }
    }

    @Override
    public Company resolveVerifiedCompany(Long hrUserId) {
        return enforceVerifiedHrAccess(hrUserId).getCompany();
    }

    private Long resolveCompanyAdminCompanyId(Long userId, String email) {
        // 1. Direct HrProfile
        HrProfile hr = hrProfileRepository.findById(userId)
                .or(() -> hrProfileRepository.findByUserId(userId))
                .orElse(null);
        if (hr != null && hr.getCompany() != null) {
            return hr.getCompany().getId();
        }

        // 2. User & Company registeredByUserId
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            return companyRepository.findAll().stream()
                    .filter(c -> (c.getRegisteredByUserId() != null && c.getRegisteredByUserId().equals(userId))
                            || (email != null && email.equalsIgnoreCase(c.getEmail())))
                    .map(Company::getId)
                    .findFirst()
                    .orElse(null);
        }

        return null;
    }
}
