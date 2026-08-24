package com.talentiq.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

public class ChatMessageDto {

    /** Payload sent from client via STOMP @MessageMapping("/chat.send") */
    @Data
    public static class SendRequest {
        @NotNull(message = "Receiver ID is required")
        private Long receiverId;

        @NotBlank(message = "Message content cannot be blank")
        private String content;

        /** TEXT | CALL_SIGNAL */
        private String type = "TEXT";
    }

    /** Typing indicator payload — ephemeral, not persisted */
    @Data
    public static class TypingPayload {
        private Long senderId;
        private Long receiverId;
        private boolean typing;
    }

    /** WebRTC signaling payload relayed via STOMP */
    @Data
    public static class SignalPayload {
        private Long senderId;
        private Long receiverId;
        /** "offer" | "answer" | "ice-candidate" | "call-end" | "call-start" */
        private String signalType;
        /** JSON string containing SDP or ICE candidate data */
        private String payload;
    }

    /** Contact entry shown in the contacts sidebar */
    @Data
    @Builder
    public static class ContactResponse {
        private Long userId;
        private String name;
        private String email;
        private String avatarUrl;
        private String companyName;
        private String jobTitle;
        private long unreadCount;
        private String lastMessage;
        private Instant lastMessageAt;
        private boolean flagged;
    }

    /** A single chat message response sent to clients */
    @Data
    @Builder
    public static class MessageResponse {
        private Long id;
        private Long senderId;
        private String senderName;
        private Long receiverId;
        private String content;
        private String type;
        private boolean read;
        private Instant sentAt;
        private String fileUrl;
        private String fileName;
    }
}
