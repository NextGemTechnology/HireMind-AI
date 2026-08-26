package com.talentiq.controller.company;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.company.CompanyDto;
import com.talentiq.service.company.CompanyService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/companies")
@RequiredArgsConstructor
@Tag(name = "Company", description = "Company profile registration, management, and directories")
public class CompanyController {

    private final CompanyService companyService;

    @PostMapping
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Register a new company")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> registerCompany(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompanyDto.RegisterRequest request) {
        CompanyDto.Response response = companyService.registerCompany(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get company details by ID")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> getCompanyById(@PathVariable Long id) {
        CompanyDto.Response response = companyService.getCompanyById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping({"/s/{slug}", "/by-slug/{slug}"})
    @Operation(summary = "Get company details by slug")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> getCompanyBySlug(@PathVariable String slug) {
        CompanyDto.Response response = companyService.getCompanyBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update company details")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> updateCompany(
            @PathVariable Long id,
            @Valid @RequestBody CompanyDto.UpdateRequest request) {
        CompanyDto.Response response = companyService.updateCompany(id, request);
        return ResponseEntity.ok(ApiResponse.success("Company profile updated", response));
    }

    @GetMapping
    @Operation(summary = "List all active companies")
    public ResponseEntity<PagedResponse<CompanyDto.Response>> listActiveCompanies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(companyService.listActiveCompanies(pageable));
    }

    @PostMapping("/{id}/verify")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Set company verification status (Admin only)")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> verifyCompany(
            @PathVariable Long id,
            @RequestParam boolean verified) {
        CompanyDto.Response response = companyService.verifyCompany(id, verified);
        return ResponseEntity.ok(ApiResponse.success(verified ? "Company verified" : "Company verification revoked", response));
    }
}
