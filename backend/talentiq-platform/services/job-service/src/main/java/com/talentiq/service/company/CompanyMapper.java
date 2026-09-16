package com.talentiq.service.company;

import com.talentiq.dto.company.CompanyDto;
import com.talentiq.model.Company;

public class CompanyMapper {

    public static CompanyDto.Response mapToResponse(Company company) {
        if (company == null) return null;
        return CompanyDto.Response.builder()
                .id(company.getId())
                .name(company.getName())
                .slug(company.getSlug())
                .website(company.getWebsite())
                .industry(company.getIndustry())
                .companySize(company.getCompanySize())
                .description(company.getDescription())
                .logoUrl(company.getLogoUrl())
                .bannerUrl(company.getBannerUrl())
                .location(company.getLocation())
                .foundedYear(company.getFoundedYear())
                .email(company.getEmail())
                .phone(company.getPhone())
                .linkedinUrl(company.getLinkedinUrl())
                .twitterUrl(company.getTwitterUrl())
                .verified(company.isVerified())
                .active(company.isActive())
                .createdAt(company.getCreatedAt())
                .build();
    }
}
