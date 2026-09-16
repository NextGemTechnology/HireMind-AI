package com.talentiq.controller.portfolio;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.portfolio.PortfolioDto;
import com.talentiq.service.portfolio.PortfolioService;
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
@RequestMapping("/v1/portfolios")
@RequiredArgsConstructor
@Tag(name = "Candidate Portfolio", description = "Candidate project portfolio showcases and media uploads")
public class PortfolioController {

    private final PortfolioService portfolioService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new portfolio showcase project")
    public ResponseEntity<ApiResponse<PortfolioDto.Response>> createPortfolio(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PortfolioDto.CreateRequest request) {
        PortfolioDto.Response response = portfolioService.createPortfolio(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Portfolio entry created", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update an existing portfolio project")
    public ResponseEntity<ApiResponse<PortfolioDto.Response>> updatePortfolio(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioDto.UpdateRequest request) {
        PortfolioDto.Response response = portfolioService.updatePortfolio(principal.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Portfolio entry updated", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a portfolio project")
    public ResponseEntity<ApiResponse<Void>> deletePortfolio(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        portfolioService.deletePortfolio(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Portfolio entry deleted"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get portfolio details by ID")
    public ResponseEntity<ApiResponse<PortfolioDto.Response>> getPortfolioById(@PathVariable Long id) {
        PortfolioDto.Response response = portfolioService.getPortfolioById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all portfolio project showcases belonging to the currently logged in user/candidate")
    public ResponseEntity<PagedResponse<PortfolioDto.Response>> listMyPortfolios(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(portfolioService.listPortfoliosByCandidateUserId(principal.getId(), pageable));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Alias for /my endpoint")
    public ResponseEntity<PagedResponse<PortfolioDto.Response>> listMePortfolios(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return listMyPortfolios(principal, page, size);
    }

    @GetMapping("/candidate/{candidateId}")
    @Operation(summary = "List all portfolio project showcases of a candidate")
    public ResponseEntity<PagedResponse<PortfolioDto.Response>> listCandidatePortfolios(
            @PathVariable Long candidateId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(portfolioService.listPortfoliosByCandidate(candidateId, pageable));
    }
}
