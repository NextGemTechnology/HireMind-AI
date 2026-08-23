package com.talentiq.service.chat;

import com.talentiq.dto.chat.ChatMessageDto;
import com.talentiq.dto.notification.NotificationDto;
import com.talentiq.infrastructure.storage.FileStorageService;
import com.talentiq.model.ChatMessage;
import com.talentiq.model.HrProfile;
import com.talentiq.model.Candidate;
import com.talentiq.repository.chat.ChatMessageRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final HrProfileRepository hrProfileRepository;
    private final CandidateRepository candidateRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;

    @Override
    public ChatMessageDto.MessageResponse sendMessage(Long senderId, ChatMessageDto.SendRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found: " + senderId));

        ChatMessage msg = ChatMessage.builder()
                .senderId(senderId)
                .senderName(sender.getFullName())
                .receiverId(request.getReceiverId())
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : "TEXT")
                .build();

        ChatMessage saved = chatMessageRepository.save(msg);
        ChatMessageDto.MessageResponse response = toResponse(saved);

        // Push to receiver's personal queue — instant real-time delivery
        messagingTemplate.convertAndSendToUser(
                String.valueOf(request.getReceiverId()),
                "/queue/chat",
                response
        );

        // Also push to sender queue for multi-device sync
        messagingTemplate.convertAndSendToUser(
                String.valueOf(senderId),
                "/queue/chat",
                response
        );

        // Also send an in-app notification (SSE) so receiver gets alert
        try {
            NotificationDto.SendRequest notifReq = new NotificationDto.SendRequest();
            notifReq.setTitle("New message from " + sender.getFullName());
            notifReq.setMessage(request.getContent().length() > 80
                    ? request.getContent().substring(0, 80) + "..."
                    : request.getContent());
            notifReq.setType("CHAT_MESSAGE");
            notifReq.setLinkUrl("/messages?contactId=" + senderId);
            notificationService.sendNotification(request.getReceiverId(), notifReq);
        } catch (Exception e) {
            log.warn("Failed to send chat notification to userId={}: {}", request.getReceiverId(), e.getMessage());
        }

        log.debug("Message {} -> {} persisted and pushed via WS", senderId, request.getReceiverId());
        return response;
    }

    @Override
    public ChatMessageDto.MessageResponse sendFileMessage(Long senderId, Long receiverId, MultipartFile file) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found: " + senderId));

        // Store the file
        String fileUrl = fileStorageService.storeFile(file, "chat-attachments", senderId);
        String fileName = file.getOriginalFilename();

        // Determine type from content type
        String contentType = file.getContentType();
        String msgType = "FILE";
        if (contentType != null && contentType.startsWith("image/")) {
            msgType = "IMAGE";
        }

        ChatMessage msg = ChatMessage.builder()
                .senderId(senderId)
                .senderName(sender.getFullName())
                .receiverId(receiverId)
                .content(fileName != null ? fileName : "Attachment")
                .type(msgType)
                .fileUrl(fileUrl)
                .fileName(fileName)
                .build();

        ChatMessage saved = chatMessageRepository.save(msg);
        ChatMessageDto.MessageResponse response = toResponse(saved);

        // Push to receiver via WebSocket
        messagingTemplate.convertAndSendToUser(
                String.valueOf(receiverId),
                "/queue/chat",
                response
        );

        // Also push to sender queue
        messagingTemplate.convertAndSendToUser(
                String.valueOf(senderId),
                "/queue/chat",
                response
        );

        // Also send notification
        try {
            NotificationDto.SendRequest notifReq = new NotificationDto.SendRequest();
            notifReq.setTitle("📎 File from " + sender.getFullName());
            notifReq.setMessage(fileName != null ? fileName : "Sent a file attachment");
            notifReq.setType("CHAT_MESSAGE");
            notifReq.setLinkUrl("/messages?contactId=" + senderId);
            notificationService.sendNotification(receiverId, notifReq);
        } catch (Exception e) {
            log.warn("Failed to send file notification to userId={}: {}", receiverId, e.getMessage());
        }

        log.debug("File message {} -> {} persisted: {}", senderId, receiverId, fileUrl);
        return response;
    }

    @Override
    public void relaySignal(Long senderId, ChatMessageDto.SignalPayload signal) {
        signal.setSenderId(senderId);
        messagingTemplate.convertAndSendToUser(
                String.valueOf(signal.getReceiverId()),
                "/queue/signal",
                signal
        );
        log.debug("WebRTC signal '{}' relayed {} -> {}", signal.getSignalType(), senderId, signal.getReceiverId());
    }

    @Override
    public void broadcastTyping(Long senderId, Long receiverId, boolean isTyping) {
        ChatMessageDto.TypingPayload payload = new ChatMessageDto.TypingPayload();
        payload.setSenderId(senderId);
        payload.setReceiverId(receiverId);
        payload.setTyping(isTyping);

        messagingTemplate.convertAndSendToUser(
                String.valueOf(receiverId),
                "/queue/typing",
                payload
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageDto.MessageResponse> getConversation(Long currentUserId, Long otherUserId) {
        // Privacy Guardrail: current authenticated user MUST be one of the participants
        return chatMessageRepository
                .findConversation(currentUserId, otherUserId, PageRequest.of(0, 100))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageDto.ContactResponse> getContacts(Long currentUserId) {
        List<Long> contactIds = chatMessageRepository.findContactIds(currentUserId);

        return contactIds.stream().map(contactId -> {
            User contact = userRepository.findById(contactId).orElse(null);
            if (contact == null) return null;

            long unread = chatMessageRepository.countBySenderIdAndReceiverIdAndReadFalse(contactId, currentUserId);

            // Get last message
            List<ChatMessage> conv = chatMessageRepository
                    .findConversation(currentUserId, contactId, PageRequest.of(0, 1));

            String lastMsg = "";
            Instant lastMsgAt = null;
            if (!conv.isEmpty()) {
                lastMsg = conv.get(conv.size() - 1).getContent();
                lastMsgAt = conv.get(conv.size() - 1).getSentAt();
            }

            // Enrich with Company & Title details (WhatsApp style)
            String companyName = null;
            String jobTitle = null;

            Optional<HrProfile> hrOpt = hrProfileRepository.findByUserId(contactId);
            if (hrOpt.isPresent()) {
                HrProfile hr = hrOpt.get();
                if (hr.getCompany() != null) {
                    companyName = hr.getCompany().getName();
                }
                jobTitle = hr.getDesignation() != null ? hr.getDesignation() : "Talent Partner / Recruiter";
            } else {
                Optional<Candidate> candOpt = candidateRepository.findByUserId(contactId);
                if (candOpt.isPresent()) {
                    Candidate cand = candOpt.get();
                    jobTitle = cand.getHeadline() != null ? cand.getHeadline() : "Candidate / Job Seeker";
                }
            }

            return ChatMessageDto.ContactResponse.builder()
                    .userId(contactId)
                    .name(contact.getFullName())
                    .email(contact.getEmail())
                    .avatarUrl(contact.getAvatarUrl())
                    .companyName(companyName)
                    .jobTitle(jobTitle)
                    .unreadCount(unread)
                    .lastMessage(lastMsg.length() > 60 ? lastMsg.substring(0, 60) + "..." : lastMsg)
                    .lastMessageAt(lastMsgAt)
                    .build();
        }).filter(c -> c != null).collect(Collectors.toList());
    }

    @Override
    public void markAsRead(Long currentUserId, Long otherUserId) {
        int updated = chatMessageRepository.markAsRead(otherUserId, currentUserId);
        log.debug("Marked {} messages as read: from {} to {}", updated, otherUserId, currentUserId);
    }

    @Override
    public void deleteMessage(Long currentUserId, Long messageId) {
        ChatMessage msg = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found with ID: " + messageId));

        // Security Guardrail: Only sender or receiver can delete
        if (!msg.getSenderId().equals(currentUserId) && !msg.getReceiverId().equals(currentUserId)) {
            throw new AccessDeniedException("You do not have permission to delete this message.");
        }

        Long receiverId = msg.getReceiverId();
        Long senderId = msg.getSenderId();

        chatMessageRepository.delete(msg);

        // Broadcast deletion event to both parties via WebSocket
        Map<String, Object> deleteEvent = Map.of(
                "action", "DELETE_MESSAGE",
                "messageId", messageId,
                "deletedBy", currentUserId
        );

        messagingTemplate.convertAndSendToUser(String.valueOf(receiverId), "/queue/chat.delete", deleteEvent);
        messagingTemplate.convertAndSendToUser(String.valueOf(senderId), "/queue/chat.delete", deleteEvent);
        log.info("Message ID {} deleted by userId={}", messageId, currentUserId);
    }

    @Override
    public void deleteConversation(Long currentUserId, Long otherUserId) {
        int count = chatMessageRepository.deleteConversation(currentUserId, otherUserId);

        Map<String, Object> deleteEvent = Map.of(
                "action", "CLEAR_CONVERSATION",
                "withUserId", otherUserId,
                "deletedBy", currentUserId
        );

        messagingTemplate.convertAndSendToUser(String.valueOf(otherUserId), "/queue/chat.delete", deleteEvent);
        messagingTemplate.convertAndSendToUser(String.valueOf(currentUserId), "/queue/chat.delete", deleteEvent);
        log.info("Cleared {} messages between userId={} and otherUserId={}", count, currentUserId, otherUserId);
    }

    private ChatMessageDto.MessageResponse toResponse(ChatMessage msg) {
        return ChatMessageDto.MessageResponse.builder()
                .id(msg.getId())
                .senderId(msg.getSenderId())
                .senderName(msg.getSenderName())
                .receiverId(msg.getReceiverId())
                .content(msg.getContent())
                .type(msg.getType())
                .read(msg.isRead())
                .sentAt(msg.getSentAt())
                .fileUrl(msg.getFileUrl())
                .fileName(msg.getFileName())
                .build();
    }
}

