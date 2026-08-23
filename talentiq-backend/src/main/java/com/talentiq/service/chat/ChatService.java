package com.talentiq.service.chat;

import com.talentiq.dto.chat.ChatMessageDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ChatService {

    /**
     * Persist a chat message and push it in real-time to the receiver.
     */
    ChatMessageDto.MessageResponse sendMessage(Long senderId, ChatMessageDto.SendRequest request);

    /**
     * Persist a chat message with a file attachment and push it in real-time to the receiver.
     */
    ChatMessageDto.MessageResponse sendFileMessage(Long senderId, Long receiverId, MultipartFile file);

    /**
     * Relay a WebRTC signaling payload (SDP offer/answer/ICE) to the target peer.
     * These are NOT persisted to the DB.
     */
    void relaySignal(Long senderId, ChatMessageDto.SignalPayload signal);

    /**
     * Broadcast a typing indicator to the receiver.
     * Not persisted.
     */
    void broadcastTyping(Long senderId, Long receiverId, boolean isTyping);

    /**
     * Fetch the message history between two users (last 100 messages).
     */
    List<ChatMessageDto.MessageResponse> getConversation(Long userId1, Long userId2);

    /**
     * Fetch contacts list for a user (people they have chatted with or applied to/received applications from).
     */
    List<ChatMessageDto.ContactResponse> getContacts(Long currentUserId);

    /**
     * Mark all messages from otherUserId to currentUserId as read.
     */
    void markAsRead(Long currentUserId, Long otherUserId);

    /**
     * Delete a single message.
     */
    void deleteMessage(Long currentUserId, Long messageId);

    /**
     * Delete entire conversation between two users.
     */
    void deleteConversation(Long currentUserId, Long otherUserId);
}
