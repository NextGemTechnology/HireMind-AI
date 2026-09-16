package com.talentiq.model;
import lombok.*;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Persisted chat message between any two platform users (HR ↔ Candidate).
 * Messages are delivered via STOMP WebSocket and persisted here for history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "chat_messages",
        indexes = {
                @Index(name = "idx_chat_msg_sender", columnList = "sender_id"),
                @Index(name = "idx_chat_msg_receiver", columnList = "receiver_id"),
                @Index(name = "idx_chat_msg_sent_at", columnList = "sent_at")
        }
)
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "sender_name", nullable = false, length = 200)
    private String senderName;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * TEXT           — regular chat message
     * CALL_SIGNAL    — WebRTC SDP offer/answer/ICE payload (JSON)
     * TYPING         — ephemeral typing indicator (not persisted, rejected at service level)
     */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String type = "TEXT";

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "sent_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant sentAt = Instant.now();

    /** URL/path to attached file (image, document). Null for plain text messages. */
    @Column(name = "file_url", length = 500)
    private String fileUrl;

    /** Original filename of the attachment. */
    @Column(name = "file_name", length = 255)
    private String fileName;
}
