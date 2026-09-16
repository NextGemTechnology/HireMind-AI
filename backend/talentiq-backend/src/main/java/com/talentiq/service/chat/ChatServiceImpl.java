package com.talentiq.service.chat;

import com.talentiq.common.enums.Role;
import com.talentiq.dto.chat.ChatMessageDto;
import com.talentiq.dto.notification.NotificationDto;
import com.talentiq.infrastructure.storage.FileStorageService;
import com.talentiq.infrastructure.kafka.KafkaProducerService;
import com.talentiq.model.ChatMessage;
import com.talentiq.model.HrProfile;
import com.talentiq.model.Candidate;
import com.talentiq.repository.chat.ChatMessageRepository;
import com.talentiq.repository.company.CompanyCandidateVerificationRepository;
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

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.talentiq.security.userdetails.UserPrincipal;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
    private final CompanyCandidateVerificationRepository verificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final KafkaProducerService kafkaProducerService;

    @Override
    public ChatMessageDto.MessageResponse sendMessage(Long senderId, ChatMessageDto.SendRequest request) {
        User sender = resolveChatParticipant(senderId, true);
        User receiver = resolveChatParticipant(request.getReceiverId(), false);

        validateDirectMessagingPermissions(sender, receiver);

        ChatMessage msg = ChatMessage.builder()
                .senderId(senderId)
                .senderName(sender.getFullName())
                .receiverId(request.getReceiverId())
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : "TEXT")
                .build();

        ChatMessage saved = chatMessageRepository.save(msg);
        ChatMessageDto.MessageResponse response = toResponse(saved);

        // Publish to Kafka message broker for distributed replicas
        kafkaProducerService.publishDirectMessage(response);

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
            boolean isReceiverHr = receiver.getRoles() != null && receiver.getRoles().contains(Role.ROLE_HR);
            String chatLink = isReceiverHr
                    ? "/hr-messages?contactId=" + senderId
                    : "/messages?contactId=" + senderId;

            NotificationDto.SendRequest notifReq = new NotificationDto.SendRequest();
            notifReq.setTitle("New message from " + sender.getFullName());
            notifReq.setMessage(request.getContent().length() > 80
                    ? request.getContent().substring(0, 80) + "..."
                    : request.getContent());
            notifReq.setType("CHAT_MESSAGE");
            notifReq.setLinkUrl(chatLink);
            notificationService.sendNotification(request.getReceiverId(), notifReq);
        } catch (Exception e) {
            log.warn("Failed to send chat notification to userId={}: {}", request.getReceiverId(), e.getMessage());
        }

        log.debug("Message {} -> {} persisted and pushed via WS", senderId, request.getReceiverId());
        return response;
    }

    @Override
    public ChatMessageDto.MessageResponse sendFileMessage(Long senderId, Long receiverId, MultipartFile file) {
        User sender = resolveChatParticipant(senderId, true);
        User receiver = resolveChatParticipant(receiverId, false);

        validateDirectMessagingPermissions(sender, receiver);

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
            boolean isReceiverHr = receiver.getRoles() != null && receiver.getRoles().contains(Role.ROLE_HR);
            String chatLink = isReceiverHr
                    ? "/hr-messages?contactId=" + senderId
                    : "/messages?contactId=" + senderId;

            NotificationDto.SendRequest notifReq = new NotificationDto.SendRequest();
            notifReq.setTitle("📎 File from " + sender.getFullName());
            notifReq.setMessage(fileName != null ? fileName : "Sent a file attachment");
            notifReq.setType("CHAT_MESSAGE");
            notifReq.setLinkUrl(chatLink);
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

        // Determine if current caller is an HR recruiter
        boolean isCallerHr = false;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
                isCallerHr = principal.getHrProfile() != null
                        || (principal.getRoles() != null && principal.getRoles().contains(Role.ROLE_HR));
            } else {
                isCallerHr = !candidateRepository.findByUserId(currentUserId).isPresent()
                        && (hrProfileRepository.findById(currentUserId).isPresent()
                        || hrProfileRepository.findByUserId(currentUserId).isPresent());
            }
        } catch (Exception ignored) {
            isCallerHr = !candidateRepository.findByUserId(currentUserId).isPresent()
                    && (hrProfileRepository.findById(currentUserId).isPresent()
                    || hrProfileRepository.findByUserId(currentUserId).isPresent());
        }

        final boolean callerIsHr = isCallerHr;

        String hrFlagKey = "hr:flagged:" + currentUserId;
        String candFlagKey = "candidate:flagged_by:" + currentUserId;
        Set<Object> hrFlagged = null;
        Set<Object> candFlagged = null;
        try {
            hrFlagged = redisTemplate.opsForSet().members(hrFlagKey);
            candFlagged = redisTemplate.opsForSet().members(candFlagKey);
        } catch (Exception e) {
            log.warn("Redis unavailable for flag lookup: {}", e.getMessage());
        }
        final Set<String> hrFlaggedStrs = hrFlagged != null
                ? hrFlagged.stream().map(Object::toString).collect(Collectors.toSet())
                : Set.of();
        final Set<String> candFlaggedStrs = candFlagged != null
                ? candFlagged.stream().map(Object::toString).collect(Collectors.toSet())
                : Set.of();

        return contactIds.stream()
                .filter(contactId -> contactId != null && !contactId.equals(currentUserId))
                .map(contactId -> {
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

                    String name = null;
                    String email = null;
                    String avatarUrl = null;
                    String companyName = null;
                    String jobTitle = null;

                    if (!callerIsHr) {
                        // Current user is Candidate -> other participant is HR Recruiter
                        Optional<HrProfile> hrOpt = hrProfileRepository.findById(contactId)
                                .or(() -> hrProfileRepository.findByUserId(contactId));
                        if (hrOpt.isPresent()) {
                            HrProfile hr = hrOpt.get();
                            name = capitalize(hr.getFullName());
                            email = hr.getEmail();
                            avatarUrl = hr.getAvatarUrl();
                            if (hr.getCompany() != null) {
                                companyName = hr.getCompany().getName();
                            }
                            jobTitle = hr.getDesignation() != null ? hr.getDesignation() : "Talent Partner / Recruiter";
                        } else {
                            User contact = userRepository.findById(contactId).orElse(null);
                            if (contact == null) return null;
                            name = contact.getFullName();
                            email = contact.getEmail();
                            avatarUrl = contact.getAvatarUrl();
                            Optional<Candidate> candOpt = candidateRepository.findByUserId(contactId);
                            if (candOpt.isPresent()) {
                                Candidate cand = candOpt.get();
                                jobTitle = cand.getHeadline() != null ? cand.getHeadline() : "Candidate / Job Seeker";
                            }
                        }
                    } else {
                        // Current user is HR -> other participant is Candidate
                        User contact = userRepository.findById(contactId).orElse(null);
                        if (contact != null) {
                            name = contact.getFullName();
                            email = contact.getEmail();
                            avatarUrl = contact.getAvatarUrl();
                            Optional<Candidate> candOpt = candidateRepository.findByUserId(contactId);
                            if (candOpt.isPresent()) {
                                Candidate cand = candOpt.get();
                                jobTitle = cand.getHeadline() != null ? cand.getHeadline() : "Candidate / Job Seeker";
                            }
                        } else {
                            Optional<HrProfile> hrOpt = hrProfileRepository.findById(contactId)
                                    .or(() -> hrProfileRepository.findByUserId(contactId));
                            if (hrOpt.isPresent()) {
                                HrProfile hr = hrOpt.get();
                                name = capitalize(hr.getFullName());
                                email = hr.getEmail();
                                avatarUrl = hr.getAvatarUrl();
                                if (hr.getCompany() != null) {
                                    companyName = hr.getCompany().getName();
                                }
                                jobTitle = hr.getDesignation() != null ? hr.getDesignation() : "Talent Partner / Recruiter";
                            } else {
                                return null;
                            }
                        }
                    }

                    boolean isFlagged = hrFlaggedStrs.contains(String.valueOf(contactId))
                            || candFlaggedStrs.contains(String.valueOf(contactId));

                    return ChatMessageDto.ContactResponse.builder()
                            .userId(contactId)
                            .name(name != null && !name.isBlank() ? name : "Contact #" + contactId)
                            .email(email)
                            .avatarUrl(avatarUrl)
                            .companyName(companyName)
                            .jobTitle(jobTitle)
                            .unreadCount(unread)
                            .lastMessage(lastMsg != null && lastMsg.length() > 60 ? lastMsg.substring(0, 60) + "..." : lastMsg)
                            .lastMessageAt(lastMsgAt)
                            .flagged(isFlagged)
                            .build();
                })
                .filter(c -> c != null)
                .collect(Collectors.toList());
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

    @Override
    public boolean toggleFlagCandidate(Long hrUserId, Long candidateUserId) {
        String hrKey = "hr:flagged:" + hrUserId;
        String candKey = "candidate:flagged_by:" + candidateUserId;
        String candIdStr = String.valueOf(candidateUserId);
        String hrIdStr = String.valueOf(hrUserId);

        boolean nowFlagged = false;
        try {
            Boolean isMember = redisTemplate.opsForSet().isMember(hrKey, candIdStr);
            if (Boolean.TRUE.equals(isMember)) {
                redisTemplate.opsForSet().remove(hrKey, candIdStr);
                redisTemplate.opsForSet().remove(candKey, hrIdStr);
                nowFlagged = false;
            } else {
                redisTemplate.opsForSet().add(hrKey, candIdStr);
                redisTemplate.opsForSet().add(candKey, hrIdStr);
                nowFlagged = true;
            }
        } catch (Exception e) {
            log.error("Failed to toggle flag in Redis: {}", e.getMessage());
        }

        // Push real-time flag event to candidate and HR via WebSocket
        try {
            Map<String, Object> flagEvent = Map.of(
                    "action", "FLAG_STATUS_CHANGE",
                    "hrUserId", hrUserId,
                    "candidateUserId", candidateUserId,
                    "flagged", nowFlagged
            );
            messagingTemplate.convertAndSendToUser(String.valueOf(candidateUserId), "/queue/chat", flagEvent);
            messagingTemplate.convertAndSendToUser(String.valueOf(hrUserId), "/queue/chat", flagEvent);
        } catch (Exception e) {
            log.warn("Failed to dispatch real-time flag event: {}", e.getMessage());
        }

        log.info("HR userId={} {} candidate userId={}", hrUserId, nowFlagged ? "flagged" : "unflagged", candidateUserId);
        return nowFlagged;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> getFlaggedCandidateIds(Long hrUserId) {
        try {
            Set<Object> members = redisTemplate.opsForSet().members("hr:flagged:" + hrUserId);
            if (members != null) {
                return members.stream()
                        .map(m -> Long.parseLong(m.toString()))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Failed to get flagged candidates from Redis: {}", e.getMessage());
        }
        return List.of();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCandidateFlagged(Long hrUserId, Long candidateUserId) {
        try {
            Boolean member = redisTemplate.opsForSet().isMember("hr:flagged:" + hrUserId, String.valueOf(candidateUserId));
            return Boolean.TRUE.equals(member);
        } catch (Exception e) {
            log.warn("Failed to check flag status in Redis: {}", e.getMessage());
            return false;
        }
    }

    private void validateDirectMessagingPermissions(User sender, User receiver) {
        if (sender.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("Cannot send messages to yourself");
        }

        Set<Role> senderRoles = sender.getRoles() != null ? sender.getRoles() : Set.of();
        Set<Role> receiverRoles = receiver.getRoles() != null ? receiver.getRoles() : Set.of();

        boolean senderIsCandidate = senderRoles.contains(Role.ROLE_CANDIDATE);
        boolean senderIsCompanyAdmin = senderRoles.contains(Role.ROLE_COMPANY_ADMIN);
        boolean senderIsHr = senderRoles.contains(Role.ROLE_HR);
        boolean senderIsSuperAdmin = senderRoles.contains(Role.ROLE_SUPER_ADMIN) || senderRoles.contains(Role.ROLE_PLATFORM_ADMIN);

        boolean receiverIsCandidate = receiverRoles.contains(Role.ROLE_CANDIDATE);
        boolean receiverIsCompanyAdmin = receiverRoles.contains(Role.ROLE_COMPANY_ADMIN);
        boolean receiverIsHr = receiverRoles.contains(Role.ROLE_HR);

        if (senderIsSuperAdmin) {
            return; // Super admins have unrestricted communication
        }

        // Rule 1: Candidate <-> Company Admin is strictly BLOCKED
        if (senderIsCandidate && receiverIsCompanyAdmin) {
            throw new AccessDeniedException("Candidates cannot message Company Executives directly. Please connect through verified company HR recruiters.");
        }
        if (senderIsCompanyAdmin && receiverIsCandidate) {
            throw new AccessDeniedException("Company Executives cannot message candidates directly. Please delegate candidate messaging to your verified HR recruiters.");
        }

        // Rule 2: HR -> Candidate outreach requires Company-Verified badge or prior conversation
        if (senderIsHr && receiverIsCandidate) {
            Optional<HrProfile> hrProfileOpt = hrProfileRepository.findById(sender.getId())
                    .or(() -> hrProfileRepository.findByUserId(sender.getId()));
            boolean isVerified = hrProfileOpt.map(HrProfile::isCompanyVerified).orElse(false);
            if (!isVerified) {
                // Check if they already have existing chat history
                boolean hasHistory = !chatMessageRepository.findConversation(sender.getId(), receiver.getId(), PageRequest.of(0, 1)).isEmpty();
                if (!hasHistory) {
                    throw new AccessDeniedException("Only Company-Verified HR recruiters can initiate direct outreach with candidates. Please request an official badge from your company dashboard.");
                }
            }
        }

        // Rule 3: Candidate -> HR messaging
        if (senderIsCandidate && receiverIsHr) {
            Optional<HrProfile> hrProfileOpt = hrProfileRepository.findById(receiver.getId())
                    .or(() -> hrProfileRepository.findByUserId(receiver.getId()));
            boolean hrIsVerified = hrProfileOpt.map(HrProfile::isCompanyVerified).orElse(false);
            boolean hasHistory = !chatMessageRepository.findConversation(sender.getId(), receiver.getId(), PageRequest.of(0, 1)).isEmpty();
            boolean hasApprovedBadge = hrProfileOpt.isPresent() && hrProfileOpt.get().getCompany() != null &&
                    verificationRepository.existsByCompanyIdAndCandidateUserIdAndStatus(
                            hrProfileOpt.get().getCompany().getId(), sender.getId(), "APPROVED");

            if (!hrIsVerified && !hasHistory && !hasApprovedBadge) {
                throw new AccessDeniedException("Recruiter is not currently verified by their company for candidate direct messaging.");
            }
        }
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

    private User resolveChatParticipant(Long id, boolean isSender) {
        // 1. If resolving sender, check current security context first
        if (isSender) {
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
                    if (id.equals(principal.getId())) {
                        if (principal.hasRole(Role.ROLE_COMPANY_ADMIN) && principal.getUser() != null) {
                            return User.builder().id(id).email(principal.getEmail())
                                    .firstName(principal.getUser().getFirstName()).lastName(principal.getUser().getLastName())
                                    .roles(principal.getRoles()).build();
                        }
                        if (principal.getHrProfile() != null || (principal.getRoles() != null && principal.getRoles().contains(Role.ROLE_HR))) {
                            HrProfile hr = principal.getHrProfile() != null
                                    ? principal.getHrProfile()
                                    : hrProfileRepository.findById(id).or(() -> hrProfileRepository.findByUserId(id)).orElse(null);
                            if (hr != null) {
                                return toUserFromHr(hr, id);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        // 2. If candidate exists in candidate table with this userId, they are a Candidate
        if (candidateRepository.findByUserId(id).isPresent()) {
            return userRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Candidate user not found: " + id));
        }

        // 3. If HR profile exists with this id, they are an HR recruiter
        Optional<HrProfile> hrOpt = hrProfileRepository.findById(id)
                .or(() -> hrProfileRepository.findByUserId(id));
        if (hrOpt.isPresent()) {
            return toUserFromHr(hrOpt.get(), id);
        }

        // 4. Fallback to general user repository
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Chat participant not found for ID: " + id));
    }

    private User toUserFromHr(HrProfile hr, Long originalId) {
        String first = hr.getFirstName() != null ? hr.getFirstName() : (hr.getUser() != null ? hr.getUser().getFirstName() : "");
        String last = hr.getLastName() != null ? hr.getLastName() : (hr.getUser() != null ? hr.getUser().getLastName() : "");
        String email = hr.getEmail() != null ? hr.getEmail() : (hr.getUser() != null ? hr.getUser().getEmail() : "");
        String avatar = hr.getAvatarUrl() != null ? hr.getAvatarUrl() : (hr.getUser() != null ? hr.getUser().getAvatarUrl() : null);

        User u = User.builder()
                .id(originalId)
                .email(email)
                .firstName(capitalize(first))
                .lastName(capitalize(last))
                .avatarUrl(avatar)
                .build();
        u.addRole(Role.ROLE_HR);
        return u;
    }

    private String capitalize(String str) {
        if (str == null || str.isBlank()) return "";
        return Arrays.stream(str.trim().split("\\s+"))
                .filter(w -> !w.isBlank())
                .map(w -> Character.toUpperCase(w.charAt(0)) + (w.length() > 1 ? w.substring(1).toLowerCase() : ""))
                .collect(Collectors.joining(" "));
    }
}
