package com.talentiq.controller.chat;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.chat.GroupChatDto;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.chat.GroupChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/chat/groups")
@RequiredArgsConstructor
@Tag(name = "Group Collaboration Chat", description = "Multi-member team channels, file sharing, and real-time collaboration")
public class GroupChatController {

    private final GroupChatService groupChatService;

    @PostMapping
    @Operation(summary = "Create a new collaborative chat group")
    public ResponseEntity<ApiResponse<GroupChatDto.GroupResponse>> createGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody GroupChatDto.CreateGroupRequest request) {
        GroupChatDto.GroupResponse res = groupChatService.createGroup(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Chat group created successfully", res));
    }

    @GetMapping
    @Operation(summary = "List all collaboration groups the user belongs to")
    public ResponseEntity<ApiResponse<List<GroupChatDto.GroupResponse>>> getUserGroups(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<GroupChatDto.GroupResponse> groups = groupChatService.getUserGroups(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(groups));
    }

    @GetMapping("/{groupId}")
    @Operation(summary = "Get group details and member roster")
    public ResponseEntity<ApiResponse<GroupChatDto.GroupResponse>> getGroupDetails(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long groupId) {
        GroupChatDto.GroupResponse res = groupChatService.getGroupDetails(principal.getId(), groupId);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/{groupId}/members")
    @Operation(summary = "Add members to group")
    public ResponseEntity<ApiResponse<GroupChatDto.GroupResponse>> addMembers(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long groupId,
            @Valid @RequestBody GroupChatDto.AddMembersRequest request) {
        GroupChatDto.GroupResponse res = groupChatService.addMembers(principal.getId(), groupId, request);
        return ResponseEntity.ok(ApiResponse.success("Members added to group", res));
    }

    @DeleteMapping("/{groupId}/members/{targetUserId}")
    @Operation(summary = "Remove member from group or leave group")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long groupId,
            @PathVariable Long targetUserId) {
        groupChatService.removeMember(principal.getId(), groupId, targetUserId);
        return ResponseEntity.ok(ApiResponse.success("Member removed from group", null));
    }

    @GetMapping("/{groupId}/messages")
    @Operation(summary = "Load message history for a group")
    public ResponseEntity<ApiResponse<List<GroupChatDto.MessageResponse>>> getGroupMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long groupId) {
        List<GroupChatDto.MessageResponse> messages = groupChatService.getGroupMessages(principal.getId(), groupId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @PostMapping("/{groupId}/messages")
    @Operation(summary = "Send a message to group via REST API")
    public ResponseEntity<ApiResponse<GroupChatDto.MessageResponse>> sendGroupMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long groupId,
            @Valid @RequestBody GroupChatDto.SendMessageRequest request) {
        GroupChatDto.MessageResponse res = groupChatService.sendGroupMessage(principal.getId(), groupId, request);
        return ResponseEntity.ok(ApiResponse.success("Message sent to group", res));
    }

    @PostMapping("/{groupId}/invite")
    @Operation(summary = "Generate an invitation link for the group")
    public ResponseEntity<ApiResponse<GroupChatDto.InviteResponse>> createInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long groupId,
            @Valid @RequestBody(required = false) GroupChatDto.CreateInviteRequest request) {
        GroupChatDto.InviteResponse res = groupChatService.createInvitation(principal.getId(), groupId, request != null ? request : new GroupChatDto.CreateInviteRequest());
        return ResponseEntity.ok(ApiResponse.success("Invitation link generated successfully", res));
    }

    @PostMapping("/join/{inviteToken}")
    @Operation(summary = "Join group via verified invitation link")
    public ResponseEntity<ApiResponse<GroupChatDto.GroupResponse>> joinGroupByInvite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String inviteToken) {
        GroupChatDto.GroupResponse res = groupChatService.joinGroupByInvite(principal.getId(), inviteToken);
        return ResponseEntity.ok(ApiResponse.success("Successfully joined the group", res));
    }

    @PostMapping(value = "/{groupId}/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and share a document, resume, or image in a group collaboration channel")
    public ResponseEntity<ApiResponse<GroupChatDto.MessageResponse>> uploadGroupFile(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long groupId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        GroupChatDto.MessageResponse res = groupChatService.sendGroupFileMessage(principal.getId(), groupId, file);
        return ResponseEntity.ok(ApiResponse.success("File shared in group chat", res));
    }

    // WebSocket STOMP endpoint for group messaging
    @MessageMapping("/group.chat.send.{groupId}")
    public void handleWsGroupMessage(
            @DestinationVariable Long groupId,
            @Payload GroupChatDto.SendMessageRequest request,
            java.security.Principal principal) {
        if (principal != null) {
            try {
                Long senderId = Long.parseLong(principal.getName());
                groupChatService.sendGroupMessage(senderId, groupId, request);
            } catch (Exception e) {
                // Ignore parsing errors for websocket auth
            }
        }
    }
}
