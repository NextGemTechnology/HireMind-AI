package com.talentiq.service.company;

import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ForbiddenException;
import org.springframework.security.core.context.SecurityContextHolder;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.company.CompanyDto;
import com.talentiq.model.Company;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;
    private final HrProfileRepository hrProfileRepository;
    private final UserRepository userRepository;

    @Override
    public CompanyDto.Response registerCompany(Long userId, CompanyDto.RegisterRequest request) {
        // Enforce 1-company-per-HR constraint
        if (hrProfileRepository.existsByUserId(userId)) {
            throw new BadRequestException("You are already associated with a company profile");
        }

        String slug = request.getSlug().toLowerCase().trim();
        if (companyRepository.existsBySlug(slug)) {
            throw new ConflictException("Company slug is already taken");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Create Company
        Company company = Company.builder()
                .name(request.getName().trim())
                .slug(slug)
                .website(request.getWebsite())
                .industry(request.getIndustry())
                .companySize(request.getCompanySize())
                .description(request.getDescription())
                .location(request.getLocation())
                .foundedYear(request.getFoundedYear())
                .email(request.getEmail())
                .phone(request.getPhone())
                .build();

        Company savedCompany = companyRepository.save(company);

        // Associate user as Company Admin in HrProfile
        HrProfile hrProfile = HrProfile.builder()
                .user(user)
                .company(savedCompany)
                .designation("Company Creator / Admin")
                .companyAdmin(true)
                .build();

        hrProfileRepository.save(hrProfile);
        log.info("Registered company: {} by HR user: {}", savedCompany.getName(), user.getEmail());

        return mapToResponse(savedCompany);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyDto.Response getCompanyById(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        return mapToResponse(company);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyDto.Response getCompanyBySlug(String slug) {
        Company company = companyRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "slug", slug));
        return mapToResponse(company);
    }

    @Override
    public CompanyDto.Response updateCompany(Long companyId, CompanyDto.UpdateRequest request) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isPlatformAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()) || "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));

        if (!isPlatformAdmin) {
            String currentUserEmail = auth != null ? auth.getName() : "";
            HrProfile hrProfile = hrProfileRepository.findByEmail(currentUserEmail)
                    .orElseThrow(() -> new ForbiddenException("Only HR profiles or Administrators can update companies"));
            if (!hrProfile.getCompany().getId().equals(companyId)) {
                throw new ForbiddenException("You do not have permission to update this company's profile");
            }
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        if (request.getName() != null) company.setName(request.getName().trim());
        if (request.getWebsite() != null) company.setWebsite(request.getWebsite().trim());
        if (request.getIndustry() != null) company.setIndustry(request.getIndustry().trim());
        if (request.getCompanySize() != null) company.setCompanySize(request.getCompanySize().trim());
        if (request.getDescription() != null) company.setDescription(request.getDescription().trim());
        if (request.getLogoUrl() != null) company.setLogoUrl(request.getLogoUrl().trim());
        if (request.getBannerUrl() != null) company.setBannerUrl(request.getBannerUrl().trim());
        if (request.getLocation() != null) company.setLocation(request.getLocation().trim());
        if (request.getFoundedYear() != null) company.setFoundedYear(request.getFoundedYear());
        if (request.getEmail() != null) company.setEmail(request.getEmail().trim());
        if (request.getPhone() != null) company.setPhone(request.getPhone().trim());
        if (request.getLinkedinUrl() != null) company.setLinkedinUrl(request.getLinkedinUrl().trim());
        if (request.getTwitterUrl() != null) company.setTwitterUrl(request.getTwitterUrl().trim());

        Company saved = companyRepository.save(company);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CompanyDto.Response> listActiveCompanies(Pageable pageable) {
        Page<Company> companies = companyRepository.findAllByActiveTrue(pageable);
        return PagedResponse.of(companies.map(CompanyServiceImpl::mapToResponse));
    }

    @Override
    public CompanyDto.Response verifyCompany(Long id, boolean verify) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        company.setVerified(verify);
        Company saved = companyRepository.save(company);
        return mapToResponse(saved);
    }

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
