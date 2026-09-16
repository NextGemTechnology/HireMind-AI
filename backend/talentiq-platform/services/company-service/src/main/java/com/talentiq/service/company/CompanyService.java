package com.talentiq.service.company;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.company.CompanyDto;
import org.springframework.data.domain.Pageable;

public interface CompanyService {

    CompanyDto.Response registerCompany(Long userId, CompanyDto.RegisterRequest request);

    CompanyDto.Response getCompanyById(Long id);

    CompanyDto.Response getCompanyBySlug(String slug);

    CompanyDto.Response updateCompany(Long companyId, CompanyDto.UpdateRequest request);

    PagedResponse<CompanyDto.Response> listActiveCompanies(Pageable pageable);

    CompanyDto.Response verifyCompany(Long id, boolean verify);
}
