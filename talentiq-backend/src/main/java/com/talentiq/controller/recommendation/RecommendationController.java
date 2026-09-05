package com.talentiq.controller.recommendation;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.copilot.AiCopilotDto;
import com.talentiq.dto.recommendation.CareerAgentDto;
import com.talentiq.dto.recommendation.RecommendationDto;
import com.talentiq.dto.recommendation.RecommendationStatusDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.recommendation.CareerAgentService;
import com.talentiq.service.recommendation.RecommendationService;
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

import java.util.List;

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

    @PostMapping("/conversations")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Start a new Career Advisor chat session (Candidate only)")
    public ResponseEntity<ApiResponse<CareerAgentDto.ConversationResponse>> createConversation(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CareerAgentDto.ConversationRequest request) {
        CareerAgentDto.ConversationResponse response = careerAgentService.createConversation(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Session created", response));
    }

    @GetMapping("/conversations")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "List candidate's past AI Career Advisor chat sessions (Candidate only)")
    public ResponseEntity<ApiResponse<List<CareerAgentDto.ConversationResponse>>> listConversations(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<CareerAgentDto.ConversationResponse> response = careerAgentService.listConversations(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/conversations/{id}/messages")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Get messages from a Career Advisor chat session (Candidate only)")
    public ResponseEntity<ApiResponse<List<AiCopilotDto.MessageResponse>>> getConversationMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        List<AiCopilotDto.MessageResponse> response = careerAgentService.getConversationMessages(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/conversations/{id}")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Delete / Archive a Career Advisor chat session (Candidate only)")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        careerAgentService.deleteConversation(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Conversation deleted successfully"));
    }

    @GetMapping("/ai-preferences")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Get user's AI privacy preferences (chat storage, retention)")
    public ResponseEntity<ApiResponse<CareerAgentDto.PreferencesDto>> getUserPreferences(
            @AuthenticationPrincipal UserPrincipal principal) {
        CareerAgentDto.PreferencesDto response = careerAgentService.getUserPreferences(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/ai-preferences")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Update user's AI privacy preferences")
    public ResponseEntity<ApiResponse<CareerAgentDto.PreferencesDto>> updateUserPreferences(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CareerAgentDto.PreferencesDto request) {
        CareerAgentDto.PreferencesDto response = careerAgentService.updateUserPreferences(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("AI preferences updated", response));
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
