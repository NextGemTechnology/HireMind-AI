package com.talentiq.controller.recommendation;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.recommendation.CareerAgentDto;
import com.talentiq.dto.recommendation.RecommendationDto;
import com.talentiq.dto.recommendation.RecommendationStatusDto;
import com.talentiq.service.recommendation.CareerAgentService;
import com.talentiq.service.recommendation.RecommendationService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "AI Recommendation Engine", description = "Job matching recommendations for candidates and HR recruiters")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final CareerAgentService careerAgentService;

    @GetMapping("/jobs")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Get personalized job recommendations (Candidate only)")
    public ResponseEntity<PagedResponse<RecommendationDto>> getJobRecommendations(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Double minScore,
            @RequestParam(defaultValue = "false") boolean refresh,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        PagedResponse<RecommendationDto> response = recommendationService.getJobRecommendationsForCandidate(
                principal.getId(),
                minScore,
                refresh,
                pageable
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Chat with AI Career Advisor Agent (Candidate only)")
    public ResponseEntity<ApiResponse<CareerAgentDto.ChatResponse>> chatWithCareerAgent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CareerAgentDto.ChatRequest request) {
        CareerAgentDto.ChatResponse response = careerAgentService.handleCandidateChatMessage(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Get candidate recommendation status, resume state, and match statistics")
    public ResponseEntity<ApiResponse<RecommendationStatusDto>> getRecommendationStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        RecommendationStatusDto status = recommendationService.getRecommendationStatusForCandidate(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @PostMapping("/recalculate")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Trigger full AI match recalculation for candidate")
    public ResponseEntity<ApiResponse<Void>> recalculateRecommendations(
            @AuthenticationPrincipal UserPrincipal principal) {
        recommendationService.recalculateAllRecommendationsForCandidate(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("AI job matches recalculated successfully"));
    }

    @GetMapping("/candidates/{jobId}")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Get matching candidate recommendations for a job (HR only)")
    public ResponseEntity<PagedResponse<RecommendationDto>> getCandidateRecommendations(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long jobId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        PagedResponse<RecommendationDto> response = recommendationService.getCandidateRecommendationsForJob(principal.getId(), jobId, pageable);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/match")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Force recalculate match score between a candidate and a job")
    public ResponseEntity<ApiResponse<RecommendationDto>> computeMatchScore(
            @RequestParam Long candidateId,
            @RequestParam Long jobId) {
        RecommendationDto response = recommendationService.computeRecommendationMatch(candidateId, jobId);
        return ResponseEntity.ok(ApiResponse.success("Match score calculated successfully", response));
    }
}
