package com.talentiq.controller.company;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.company.CompanyVerificationDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.company.CompanyVerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/company/verifications")
@RequiredArgsConstructor
@Tag(name = "Company Verification & Badges", description = "Company-HR candidate tag request and director approval workflow")
public class CompanyVerificationController {

    private final CompanyVerificationService verificationService;

    @PostMapping("/request")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "HR initiates a company verified tag request for a candidate")
    public ResponseEntity<ApiResponse<CompanyVerificationDto.Response>> requestTag(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompanyVerificationDto.RequestTag request) {
        CompanyVerificationDto.Response res = verificationService.requestCandidateTag(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Verification tag request submitted for company approval", res));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Company director / admin views pending verification requests for their company")
    public ResponseEntity<PagedResponse<CompanyVerificationDto.Response>> getPendingVerifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "requestedAt"));
        return ResponseEntity.ok(verificationService.getCompanyPendingVerifications(principal.getId(), status, pageable));
    }

    @PutMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Company director approves or rejects candidate verification tag")
    public ResponseEntity<ApiResponse<CompanyVerificationDto.Response>> processDecision(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody CompanyVerificationDto.ApproveRejectRequest request) {
        CompanyVerificationDto.Response res = verificationService.processVerificationDecision(principal.getId(), id, request);
        String msg = request.isApproved() ? "Candidate verified successfully with company tag" : "Candidate verification request rejected";
        return ResponseEntity.ok(ApiResponse.success(msg, res));
    }

    @GetMapping("/candidate/{candidateId}")
    @Operation(summary = "Public / recruiter view of approved company verification badges for a candidate")
    public ResponseEntity<ApiResponse<List<CompanyVerificationDto.Response>>> getCandidateBadges(
            @PathVariable Long candidateId) {
        List<CompanyVerificationDto.Response> badges = verificationService.getCandidateApprovedBadges(candidateId);
        return ResponseEntity.ok(ApiResponse.success(badges));
    }

    @GetMapping("/certificate/{certificateId}")
    @Operation(summary = "Verify authenticity of a company credential certificate ID")
    public ResponseEntity<ApiResponse<CompanyVerificationDto.Response>> getCertificate(
            @PathVariable String certificateId) {
        CompanyVerificationDto.Response cert = verificationService.getVerificationByCertificate(certificateId);
        return ResponseEntity.ok(ApiResponse.success(cert));
    }
}
