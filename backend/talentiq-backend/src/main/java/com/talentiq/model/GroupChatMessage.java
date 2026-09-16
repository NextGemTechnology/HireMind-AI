package com.talentiq.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Message sent inside a collaborative chat group.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "group_chat_messages",
        indexes = {
                @Index(name = "idx_group_msg_group_sent", columnList = "group_id, sent_at"),
                @Index(name = "idx_group_msg_sender", columnList = "sender_id")
        }
)
@Builder
public class GroupChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private ChatGroup group;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "sender_name", nullable = false, length = 200)
    private String senderName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String type = "TEXT"; // TEXT, FILE, IMAGE, SYSTEM

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "sent_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant sentAt = Instant.now();
}
