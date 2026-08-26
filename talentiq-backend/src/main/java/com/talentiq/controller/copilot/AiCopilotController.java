package com.talentiq.controller.copilot;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.copilot.AiCopilotDto;
import com.talentiq.service.copilot.AiCopilotService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/copilot")
@RequiredArgsConstructor
@Tag(name = "AI Copilot", description = "AI chat assistant, recruiter context Q&A, and LLM configuration settings")
public class AiCopilotController {

    private final AiCopilotService copilotService;

    @PostMapping("/conversations")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Start a new AI copilot conversation session (HR only)")
    public ResponseEntity<ApiResponse<AiCopilotDto.ConversationResponse>> createConversation(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiCopilotDto.ConversationRequest request) {
        AiCopilotDto.ConversationResponse response = copilotService.createConversation(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Conversation session initialized", response));
    }

    @GetMapping("/conversations")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "List all active copilot conversations (HR only)")
    public ResponseEntity<ApiResponse<List<AiCopilotDto.ConversationResponse>>> listConversations(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<AiCopilotDto.ConversationResponse> response = copilotService.listConversations(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/conversations/{id}/messages")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Send a prompt message to the copilot chat session (HR only)")
    public ResponseEntity<ApiResponse<AiCopilotDto.MessageResponse>> sendMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AiCopilotDto.MessageRequest request) {
        AiCopilotDto.MessageResponse response = copilotService.sendMessage(principal.getId(), id, request.getContent());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/conversations/{id}/messages")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Get message log timeline of a conversation session (HR only)")
    public ResponseEntity<ApiResponse<List<AiCopilotDto.MessageResponse>>> getMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        List<AiCopilotDto.MessageResponse> response = copilotService.getMessages(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/config")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Get recruiter's custom copilot LLM configuration parameters")
    public ResponseEntity<ApiResponse<AiCopilotDto.ConfigResponse>> getConfig(
            @AuthenticationPrincipal UserPrincipal principal) {
        AiCopilotDto.ConfigResponse response = copilotService.getConfig(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/config")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Update recruiter's custom copilot LLM configuration parameters")
    public ResponseEntity<ApiResponse<AiCopilotDto.ConfigResponse>> updateConfig(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiCopilotDto.ConfigUpdateRequest request) {
        AiCopilotDto.ConfigResponse response = copilotService.updateConfig(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Copilot configuration updated successfully", response));
    }
}
