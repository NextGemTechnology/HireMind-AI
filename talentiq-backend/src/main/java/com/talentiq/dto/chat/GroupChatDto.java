package com.talentiq.dto.chat;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class GroupChatDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateGroupRequest {
        @NotBlank(message = "Group name is required")
        private String name;

        private String description;
        private Long companyId;
        private List<Long> memberUserIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AddMembersRequest {
        private List<Long> userIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SendMessageRequest {
        @NotBlank(message = "Message content is required")
        private String content;

        @Builder.Default
        private String type = "TEXT"; // TEXT, FILE, IMAGE, SYSTEM

        private String fileUrl;
        private String fileName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberResponse {
        private Long id;
        private Long userId;
        private String name;
        private String email;
        private String avatarUrl;
        private String role; // ADMIN, MEMBER
        private Instant joinedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GroupResponse {
        private Long id;
        private String name;
        private String description;
        private Long companyId;
        private String companyName;
        private Long createdById;
        private String createdByName;
        private String avatarUrl;
        private Instant createdAt;
        private int memberCount;
        private List<MemberResponse> members;
        private String lastMessage;
        private Instant lastMessageAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageResponse {
        private Long id;
        private Long groupId;
        private Long senderId;
        private String senderName;
        private String content;
        private String type;
        private String fileUrl;
        private String fileName;
        private Instant sentAt;
    }
}
