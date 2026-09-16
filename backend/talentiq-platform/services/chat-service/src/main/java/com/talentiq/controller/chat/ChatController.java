package com.talentiq.controller.chat;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.chat.ChatMessageDto;
import com.talentiq.service.chat.ChatService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

/**
 * Chat controller: handles both STOMP WebSocket message routing and REST history/contacts APIs.
 *
 * WebSocket topics:
 *   /app/chat.send      — send a text message
 *   /app/chat.signal    — relay WebRTC signaling (offer/answer/ICE)
 *   /app/chat.typing    — typing indicator
 *
 * Personal queues subscribed by client:
 *   /user/queue/chat     — new incoming messages
 *   /user/queue/signal   — WebRTC signaling
 *   /user/queue/typing   — typing events
 *
 * REST endpoints:
 *   POST   /v1/chat/messages               — send a text message (REST fallback)
 *   POST   /v1/chat/upload                  — upload a file attachment
 *   GET    /v1/chat/conversations/{userId}  — get message history
 *   GET    /v1/chat/contacts                — get contacts list
 *   PUT    /v1/chat/conversations/{userId}/read — mark messages as read
 */
@RestController
@RequestMapping("/v1/chat")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Real-Time Chat", description = "WebSocket STOMP messaging + REST history APIs")
public class ChatController {

    private final ChatService chatService;
    private final com.talentiq.infrastructure.storage.FileStorageService fileStorageService;
    private final com.talentiq.security.jwt.JwtService jwtService;

    // ── STOMP WebSocket Handlers ────────────────────────────────────────────────

    /**
     * Client sends: STOMP SEND /app/chat.send
     * Server routes message to: /user/{receiverId}/queue/chat
     */
    @MessageMapping("/chat.send")
    public void handleChatMessage(@Payload ChatMessageDto.SendRequest request,
                                  SimpMessageHeaderAccessor headerAccessor) {
        Long senderId = extractSenderId(headerAccessor);
        if (senderId == null) {
            log.warn("Unauthenticated WebSocket message rejected: {}", request);
            return;
        }
        chatService.sendMessage(senderId, request);
    }

    private Long extractSenderId(SimpMessageHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();
        if (principal != null && principal.getName() != null) {
            try {
                return Long.parseLong(principal.getName());
            } catch (NumberFormatException ignored) {}
        }
        String authHeader = headerAccessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                return jwtService.extractUserId(authHeader.substring(7));
            } catch (Exception ignored) {}
        }
        return null;
    }

    /**
     * WebRTC signaling relay — SDP offer/answer/ICE candidates.
     * Client sends: STOMP SEND /app/chat.signal
     */
    @MessageMapping("/chat.signal")
    public void handleSignal(@Payload ChatMessageDto.SignalPayload signal,
                             SimpMessageHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();
        if (principal == null) return;
        Long senderId = Long.parseLong(principal.getName());
        chatService.relaySignal(senderId, signal);
    }

    /**
     * Typing indicator — ephemeral, not persisted.
     * Client sends: STOMP SEND /app/chat.typing
     */
    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload ChatMessageDto.TypingPayload payload,
                             SimpMessageHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();
        if (principal == null) return;
        Long senderId = Long.parseLong(principal.getName());
        chatService.broadcastTyping(senderId, payload.getReceiverId(), payload.isTyping());
    }

    // ── REST APIs ───────────────────────────────────────────────────────────────

    /**
     * REST fallback for sending a text message (when WebSocket is not available).
     */
    @PostMapping("/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Send a chat message via REST (fallback when WebSocket is unavailable)")
    public ResponseEntity<ApiResponse<ChatMessageDto.MessageResponse>> sendMessageRest(
            @RequestBody @Valid ChatMessageDto.SendRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ChatMessageDto.MessageResponse response = chatService.sendMessage(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Upload a file/image attachment in chat.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a file or image as a chat attachment")
    public ResponseEntity<ApiResponse<ChatMessageDto.MessageResponse>> uploadChatFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("receiverId") Long receiverId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ChatMessageDto.MessageResponse response = chatService.sendFileMessage(principal.getId(), receiverId, file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/conversations/{otherUserId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get message history between current user and another user")
    public ResponseEntity<ApiResponse<List<ChatMessageDto.MessageResponse>>> getConversation(
            @PathVariable Long otherUserId,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<ChatMessageDto.MessageResponse> messages =
                chatService.getConversation(principal.getId(), otherUserId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @GetMapping("/contacts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of chat contacts for the current user")
    public ResponseEntity<ApiResponse<List<ChatMessageDto.ContactResponse>>> getContacts(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<ChatMessageDto.ContactResponse> contacts = chatService.getContacts(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(contacts));
    }

    /**
     * Mark all messages from otherUserId as read for the current user.
     */
    @PutMapping("/conversations/{otherUserId}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark all messages from another user as read")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @PathVariable Long otherUserId,
            @AuthenticationPrincipal UserPrincipal principal) {
        chatService.markAsRead(principal.getId(), otherUserId);
        return ResponseEntity.ok(ApiResponse.success("Messages marked as read"));
    }

    /**
     * Delete a single message.
     */
    @DeleteMapping("/messages/{messageId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a chat message (sender or recipient)")
    public ResponseEntity<ApiResponse<String>> deleteMessage(
            @PathVariable Long messageId,
            @AuthenticationPrincipal UserPrincipal principal) {
        chatService.deleteMessage(principal.getId(), messageId);
        return ResponseEntity.ok(ApiResponse.success("Message deleted"));
    }

    /**
     * Delete entire conversation thread.
     */
    @DeleteMapping("/conversations/{otherUserId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete all messages in a conversation")
    public ResponseEntity<ApiResponse<String>> deleteConversation(
            @PathVariable Long otherUserId,
            @AuthenticationPrincipal UserPrincipal principal) {
        chatService.deleteConversation(principal.getId(), otherUserId);
        return ResponseEntity.ok(ApiResponse.success("Conversation cleared"));
    }

    /**
     * Serve uploaded chat files/images (authenticated users only).
     */
    @GetMapping("/files/**")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Retrieve a chat attachment file or image")
    public ResponseEntity<byte[]> getChatFile(jakarta.servlet.http.HttpServletRequest request) {
        String fullPath = request.getRequestURI();
        // Path after /api/v1/chat/files/ or /v1/chat/files/
        String subPath = fullPath.substring(fullPath.indexOf("/chat/files/") + "/chat/files/".length());
        byte[] bytes = fileStorageService.retrieveFile(subPath);

        org.springframework.http.MediaType mediaType = org.springframework.http.MediaType.APPLICATION_OCTET_STREAM;
        String lower = subPath.toLowerCase();
        if (lower.endsWith(".png")) mediaType = org.springframework.http.MediaType.IMAGE_PNG;
        else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mediaType = org.springframework.http.MediaType.IMAGE_JPEG;
        else if (lower.endsWith(".gif")) mediaType = org.springframework.http.MediaType.IMAGE_GIF;
        else if (lower.endsWith(".webp")) mediaType = org.springframework.http.MediaType.parseMediaType("image/webp");
        else if (lower.endsWith(".pdf")) mediaType = org.springframework.http.MediaType.APPLICATION_PDF;

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(bytes);
    }

    /**
     * Flag or unflag a candidate contact (by HR).
     */
    @PostMapping("/flag/{otherUserId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Toggle flag / priority mark on a chat contact")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> toggleFlag(
            @PathVariable Long otherUserId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean flagged = chatService.toggleFlagCandidate(principal.getId(), otherUserId);
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of(
                "otherUserId", otherUserId,
                "flagged", flagged,
                "message", flagged ? "Candidate flagged as priority" : "Candidate unflagged"
        )));
    }

    /**
     * Get all flagged candidate user IDs for current user.
     */
    @GetMapping("/flagged")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of flagged candidate user IDs")
    public ResponseEntity<ApiResponse<List<Long>>> getFlagged(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Long> flaggedIds = chatService.getFlaggedCandidateIds(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(flaggedIds));
    }
}
