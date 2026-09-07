package com.talentiq.service.company;

import com.talentiq.model.Company;
import com.talentiq.model.HrProfile;
import com.talentiq.security.userdetails.UserPrincipal;

public interface CompanySecurityService {

    /**
     * Enforces that the caller is an officially verified HR recruiter for targetCompanyId.
     * Throws ForbiddenException if:
     * - HR profile is not found or inactive
     * - HR is not verified by company leadership (companyVerified == false && !companyAdmin)
     * - targetCompanyId does not match the HR's verified company ID
     *
     * @param hrUserId        the user ID or hrProfile ID of the HR caller
     * @param targetCompanyId the company ID being accessed (or null to only verify HR status)
     * @return the verified HrProfile
     */
    HrProfile enforceVerifiedHrAccess(Long hrUserId, Long targetCompanyId);

    /**
     * Enforces that the caller is an officially verified HR recruiter for their company.
     *
     * @param hrUserId the user ID or hrProfile ID of the HR caller
     * @return the verified HrProfile
     */
    HrProfile enforceVerifiedHrAccess(Long hrUserId);

    /**
     * Validates company-level access for an authenticated principal across roles:
     * - ROLE_SUPER_ADMIN / ROLE_PLATFORM_ADMIN: allowed across all companies
     * - ROLE_COMPANY_ADMIN: allowed only for their owned/registered company
     * - ROLE_HR: allowed ONLY if officially verified for targetCompanyId
     *
     * @param principal       the authenticated UserPrincipal
     * @param targetCompanyId the company ID being accessed
     */
    void validateCompanyAccess(UserPrincipal principal, Long targetCompanyId);

    /**
     * Enforces the single active company verification badge rule:
     * An HR recruiter can hold at most ONE active corporate verification badge.
     * Throws ConflictException if the HR already holds an active badge for a different company.
     *
     * @param hrProfileId the target HR profile ID
     * @param newCompanyId the company ID attempting to verify or affiliate the HR
     */
    void validateSingleActiveBadge(Long hrProfileId, Long newCompanyId);

    /**
     * Resolves the verified Company for an HR caller.
     *
     * @param hrUserId the HR user ID
     * @return the Company entity
     */
    Company resolveVerifiedCompany(Long hrUserId);
}
