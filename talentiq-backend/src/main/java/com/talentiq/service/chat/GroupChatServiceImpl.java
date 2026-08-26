package com.talentiq.service.chat;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.dto.chat.GroupChatDto;
import com.talentiq.model.ChatGroup;
import com.talentiq.model.ChatGroupMember;
import com.talentiq.model.GroupChatMessage;
import com.talentiq.model.GroupChatInvitation;
import com.talentiq.model.User;
import com.talentiq.repository.chat.ChatGroupMemberRepository;
import com.talentiq.repository.chat.ChatGroupRepository;
import com.talentiq.repository.chat.GroupChatMessageRepository;
import com.talentiq.repository.chat.GroupChatInvitationRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.company.CompanyCandidateVerificationRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.infrastructure.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GroupChatServiceImpl implements GroupChatService {

    private final ChatGroupRepository groupRepository;
    private final ChatGroupMemberRepository memberRepository;
    private final GroupChatMessageRepository messageRepository;
    private final GroupChatInvitationRepository invitationRepository;
    private final CompanyCandidateVerificationRepository verificationRepository;
    private final HrProfileRepository hrProfileRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.talentiq.infrastructure.kafka.KafkaProducerService kafkaProducerService;

    @Override
    public GroupChatDto.GroupResponse createGroup(Long currentUserId, GroupChatDto.CreateGroupRequest request) {
        User creator = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        ChatGroup group = ChatGroup.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .companyId(request.getCompanyId())
                .creatorUser(creator)
                .active(true)
                .build();

        ChatGroup savedGroup = groupRepository.save(group);

        // Add creator as ADMIN member
        ChatGroupMember adminMember = ChatGroupMember.builder()
                .group(savedGroup)
                .user(creator)
                .role("ADMIN")
                .joinedAt(Instant.now())
                .build();
        memberRepository.save(adminMember);

        // Add initial members if provided
        if (request.getMemberUserIds() != null) {
            for (Long uid : request.getMemberUserIds()) {
                if (!uid.equals(currentUserId)) {
                    userRepository.findById(uid).ifPresent(u -> {
                        ChatGroupMember m = ChatGroupMember.builder()
                                .group(savedGroup)
                                .user(u)
                                .role("MEMBER")
                                .joinedAt(Instant.now())
                                .build();
                        memberRepository.save(m);
                    });
                }
            }
        }

        // Add system welcome message
        GroupChatMessage welcomeMsg = GroupChatMessage.builder()
                .group(savedGroup)
                .senderId(currentUserId)
                .senderName("System")
                .content("🎉 Group \"" + savedGroup.getName() + "\" created by " + creator.getFirstName() + " " + creator.getLastName())
                .type("SYSTEM")
                .sentAt(Instant.now())
                .build();
        messageRepository.save(welcomeMsg);

        log.info("Chat group ID {} created by User ID {}", savedGroup.getId(), currentUserId);
        return getGroupDetails(currentUserId, savedGroup.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupChatDto.GroupResponse> getUserGroups(Long currentUserId) {
        List<ChatGroup> groups = groupRepository.findGroupsByUserId(currentUserId);
        return groups.stream()
                .map(g -> mapToGroupResponse(g, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public GroupChatDto.GroupResponse getGroupDetails(Long currentUserId, Long groupId) {
        ChatGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatGroup", "id", groupId));

        if (!memberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new ForbiddenException("You are not a member of this chat group.");
        }

        return mapToGroupResponse(group, true);
    }

    @Override
    public GroupChatDto.GroupResponse addMembers(Long currentUserId, Long groupId, GroupChatDto.AddMembersRequest request) {
        ChatGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatGroup", "id", groupId));

        ChatGroupMember currentMember = memberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new ForbiddenException("You must be an existing group member to invite others."));

        if (!"ADMIN".equals(currentMember.getRole())) {
            throw new ForbiddenException("Only group admins can add members directly.");
        }

        if (request.getUserIds() != null) {
            for (Long uid : request.getUserIds()) {
                if (!memberRepository.existsByGroupIdAndUserId(groupId, uid)) {
                    User targetUser = userRepository.findById(uid)
                            .orElseThrow(() -> new ResourceNotFoundException("User", "id", uid));

                    // Candidates cannot be directly added; they must join through the company invitation link
                    if (targetUser.getRoles().contains(Role.ROLE_CANDIDATE)) {
                        throw new ForbiddenException("Candidates cannot be added directly to company collaboration groups. Please generate an invitation link for verified candidates.");
                    }

                    ChatGroupMember m = ChatGroupMember.builder()
                            .group(group)
                            .user(targetUser)
                            .role("MEMBER")
                            .joinedAt(Instant.now())
                            .build();
                    memberRepository.save(m);

                    // Broadcast system notice
                    GroupChatMessage notice = GroupChatMessage.builder()
                            .group(group)
                            .senderId(currentUserId)
                            .senderName("System")
                            .content("👋 " + targetUser.getFirstName() + " " + targetUser.getLastName() + " joined the group.")
                            .type("SYSTEM")
                            .sentAt(Instant.now())
                            .build();
                    GroupChatMessage savedNotice = messageRepository.save(notice);
                    broadcastMessage(groupId, mapToMessageResponse(savedNotice));
                }
            }
        }

        return getGroupDetails(currentUserId, groupId);
    }

    @Override
    public void removeMember(Long currentUserId, Long groupId, Long targetUserId) {
        ChatGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatGroup", "id", groupId));

        ChatGroupMember currentMember = memberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this group."));

        // If self-leaving
        if (currentUserId.equals(targetUserId)) {
            memberRepository.deleteByGroupIdAndUserId(groupId, targetUserId);
            return;
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        boolean isCompanyAdmin = currentUser.getRoles().contains(Role.ROLE_COMPANY_ADMIN) ||
                currentUser.getRoles().contains(Role.ROLE_SUPER_ADMIN);
        boolean isGroupAdmin = "ADMIN".equals(currentMember.getRole());

        if (isCompanyAdmin) {
            // Company Admin can remove anyone (both HR and Candidate)
            memberRepository.deleteByGroupIdAndUserId(groupId, targetUserId);
        } else if (isGroupAdmin) {
            // HR Group Admin can remove Candidates, but CANNOT remove Company Admin
            if (targetUser.getRoles().contains(Role.ROLE_COMPANY_ADMIN) || targetUser.getRoles().contains(Role.ROLE_SUPER_ADMIN)) {
                throw new ForbiddenException("HR recruiters cannot remove Company Executives from the group.");
            }
            memberRepository.deleteByGroupIdAndUserId(groupId, targetUserId);
        } else {
            throw new ForbiddenException("Only group admins or company executives can remove members.");
        }

        // Post system notice
        GroupChatMessage notice = GroupChatMessage.builder()
                .group(group)
                .senderId(currentUserId)
                .senderName("System")
                .content("🚪 " + targetUser.getFirstName() + " " + targetUser.getLastName() + " was removed from the group.")
                .type("SYSTEM")
                .sentAt(Instant.now())
                .build();
        GroupChatMessage savedNotice = messageRepository.save(notice);
        broadcastMessage(groupId, mapToMessageResponse(savedNotice));
    }

    @Override
    public GroupChatDto.InviteResponse createInvitation(Long currentUserId, Long groupId, GroupChatDto.CreateInviteRequest request) {
        ChatGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatGroup", "id", groupId));

        ChatGroupMember currentMember = memberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this chat group."));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        boolean isCompanyAdmin = currentUser.getRoles().contains(Role.ROLE_COMPANY_ADMIN) ||
                currentUser.getRoles().contains(Role.ROLE_SUPER_ADMIN);
        boolean isGroupAdmin = "ADMIN".equals(currentMember.getRole());

        if (!isCompanyAdmin && !isGroupAdmin) {
            throw new ForbiddenException("Only company executives or HR group admins can generate invitation links.");
        }

        String token = UUID.randomUUID().toString().replace("-", "") + System.currentTimeMillis();
        int days = request != null && request.getExpiryDays() > 0 ? request.getExpiryDays() : 7;
        int maxUses = request != null && request.getMaxUses() > 0 ? request.getMaxUses() : 10;
        Instant expiresAt = Instant.now().plus(days, ChronoUnit.DAYS);

        User targetUser = null;
        if (request != null && request.getTargetUserId() != null) {
            targetUser = userRepository.findById(request.getTargetUserId()).orElse(null);
        }

        GroupChatInvitation invitation = GroupChatInvitation.builder()
                .group(group)
                .inviteToken(token)
                .createdByUser(currentUser)
                .targetUser(targetUser)
                .maxUses(maxUses)
                .currentUses(0)
                .expiresAt(expiresAt)
                .active(true)
                .build();

        invitationRepository.save(invitation);

        String companyName = group.getCompanyId() != null
                ? companyRepository.findById(group.getCompanyId()).map(com.talentiq.model.Company::getName).orElse("Company")
                : "Company";

        return GroupChatDto.InviteResponse.builder()
                .inviteToken(token)
                .groupId(group.getId())
                .groupName(group.getName())
                .companyName(companyName)
                .createdByName(currentUser.getFullName())
                .expiresAt(expiresAt)
                .maxUses(maxUses)
                .currentUses(0)
                .inviteLink("/team-chat/join/" + token)
                .build();
    }

    @Override
    public GroupChatDto.GroupResponse joinGroupByInvite(Long currentUserId, String inviteToken) {
        GroupChatInvitation invite = invitationRepository.findValidByToken(inviteToken, Instant.now())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid, expired, or deactivated invitation link."));

        if (invite.getCurrentUses() >= invite.getMaxUses()) {
            invite.setActive(false);
            invitationRepository.save(invite);
            throw new ForbiddenException("This invitation link has reached its maximum usage limit.");
        }

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        // If invite is targeted to a specific user
        if (invite.getTargetUser() != null && !invite.getTargetUser().getId().equals(currentUserId)) {
            throw new ForbiddenException("This invitation link was issued for a different recipient.");
        }

        ChatGroup group = invite.getGroup();

        // Check verification gate for candidates:
        // A candidate must have an APPROVED company verification badge for this company
        if (user.getRoles().contains(Role.ROLE_CANDIDATE)) {
            if (group.getCompanyId() != null) {
                boolean isVerified = verificationRepository.existsByCompanyIdAndCandidateUserIdAndStatus(
                        group.getCompanyId(), currentUserId, "APPROVED");
                if (!isVerified) {
                    throw new ForbiddenException("Access Denied: Only candidates with an official APPROVED verification badge from this company can join company collaboration groups. Please obtain company verification first.");
                }
            }
        }

        // Check if already a member
        if (memberRepository.existsByGroupIdAndUserId(group.getId(), currentUserId)) {
            return getGroupDetails(currentUserId, group.getId());
        }

        // Add user as MEMBER
        ChatGroupMember member = ChatGroupMember.builder()
                .group(group)
                .user(user)
                .role("MEMBER")
                .joinedAt(Instant.now())
                .build();
        memberRepository.save(member);

        // Update invitation usage count
        invite.setCurrentUses(invite.getCurrentUses() + 1);
        if (invite.getCurrentUses() >= invite.getMaxUses()) {
            invite.setActive(false);
        }
        invitationRepository.save(invite);

        // Broadcast system welcome
        GroupChatMessage welcome = GroupChatMessage.builder()
                .group(group)
                .senderId(currentUserId)
                .senderName("System")
                .content("🎉 " + user.getFirstName() + " " + user.getLastName() + " joined the group via official invite.")
                .type("SYSTEM")
                .sentAt(Instant.now())
                .build();
        GroupChatMessage saved = messageRepository.save(welcome);
        broadcastMessage(group.getId(), mapToMessageResponse(saved));

        log.info("User {} joined group {} via invite token {}", user.getEmail(), group.getId(), inviteToken);
        return getGroupDetails(currentUserId, group.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupChatDto.MessageResponse> getGroupMessages(Long currentUserId, Long groupId) {
        if (!memberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new ForbiddenException("You are not a member of this chat group.");
        }

        return messageRepository.findByGroupIdOrderBySentAtAsc(groupId)
                .stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Override
    public GroupChatDto.MessageResponse sendGroupMessage(Long currentUserId, Long groupId, GroupChatDto.SendMessageRequest request) {
        ChatGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatGroup", "id", groupId));

        if (!memberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new ForbiddenException("You must be a member of this group to send messages.");
        }

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        GroupChatMessage msg = GroupChatMessage.builder()
                .group(group)
                .senderId(currentUserId)
                .senderName(sender.getFirstName() + " " + sender.getLastName())
                .content(request.getContent().trim())
                .type(request.getType() != null ? request.getType() : "TEXT")
                .fileUrl(request.getFileUrl())
                .fileName(request.getFileName())
                .sentAt(Instant.now())
                .build();

        GroupChatMessage saved = messageRepository.save(msg);
        GroupChatDto.MessageResponse response = mapToMessageResponse(saved);

        // Broadcast to WebSocket STOMP topic
        broadcastMessage(groupId, response);

        return response;
    }

    @Override
    public GroupChatDto.MessageResponse sendGroupFileMessage(Long currentUserId, Long groupId, MultipartFile file) {
        ChatGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatGroup", "id", groupId));

        // Enforce membership check
        if (!memberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new ForbiddenException("You are not a member of this group");
        }

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        String fileUrl = fileStorageService.storeFile(file, "group-chat-attachments", currentUserId);
        String fileName = file.getOriginalFilename();
        String contentType = file.getContentType();
        String msgType = (contentType != null && contentType.startsWith("image/")) ? "IMAGE" : "FILE";

        GroupChatMessage msg = GroupChatMessage.builder()
                .group(group)
                .senderId(currentUserId)
                .senderName(sender.getFirstName() + " " + sender.getLastName())
                .content(fileName != null ? fileName : "Shared a file attachment")
                .type(msgType)
                .fileUrl(fileUrl)
                .fileName(fileName)
                .sentAt(Instant.now())
                .build();

        GroupChatMessage saved = messageRepository.save(msg);
        GroupChatDto.MessageResponse response = mapToMessageResponse(saved);

        broadcastMessage(groupId, response);
        log.info("File attachment uploaded to Group ID {} by User ID {}: {}", groupId, currentUserId, fileName);
        return response;
    }

    private void broadcastMessage(Long groupId, GroupChatDto.MessageResponse message) {
        kafkaProducerService.publishGroupMessage(groupId, message);
        try {
            messagingTemplate.convertAndSend("/topic/group." + groupId, message);
        } catch (Exception e) {
            log.error("Failed to broadcast group message over WebSocket", e);
        }
    }

    private GroupChatDto.GroupResponse mapToGroupResponse(ChatGroup g, boolean includeMembers) {
        List<GroupChatDto.MemberResponse> members = null;
        if (includeMembers) {
            members = memberRepository.findByGroupId(g.getId())
                    .stream()
                    .map(m -> GroupChatDto.MemberResponse.builder()
                            .id(m.getId())
                            .userId(m.getUser().getId())
                            .name(m.getUser().getFirstName() + " " + m.getUser().getLastName())
                            .email(m.getUser().getEmail())
                            .avatarUrl(m.getUser().getAvatarUrl())
                            .role(m.getRole())
                            .joinedAt(m.getJoinedAt())
                            .build())
                    .collect(Collectors.toList());
        }

        String companyName = null;
        if (g.getCompanyId() != null) {
            companyName = companyRepository.findById(g.getCompanyId()).map(com.talentiq.model.Company::getName).orElse(null);
        }

        List<GroupChatMessage> latestMsgs = messageRepository.findByGroupIdOrderBySentAtAsc(g.getId());
        String lastMsg = null;
        Instant lastMsgAt = null;
        if (!latestMsgs.isEmpty()) {
            GroupChatMessage last = latestMsgs.get(latestMsgs.size() - 1);
            lastMsg = last.getContent();
            lastMsgAt = last.getSentAt();
        }

        return GroupChatDto.GroupResponse.builder()
                .id(g.getId())
                .name(g.getName())
                .description(g.getDescription())
                .companyId(g.getCompanyId())
                .companyName(companyName)
                .createdById(g.getCreatorUser().getId())
                .createdByName(g.getCreatorUser().getFirstName() + " " + g.getCreatorUser().getLastName())
                .avatarUrl(g.getAvatarUrl())
                .createdAt(g.getCreatedAt())
                .memberCount(includeMembers && members != null ? members.size() : memberRepository.findByGroupId(g.getId()).size())
                .members(members)
                .lastMessage(lastMsg)
                .lastMessageAt(lastMsgAt)
                .build();
    }

    private GroupChatDto.MessageResponse mapToMessageResponse(GroupChatMessage m) {
        return GroupChatDto.MessageResponse.builder()
                .id(m.getId())
                .groupId(m.getGroup().getId())
                .senderId(m.getSenderId())
                .senderName(m.getSenderName())
                .content(m.getContent())
                .type(m.getType())
                .fileUrl(m.getFileUrl())
                .fileName(m.getFileName())
                .sentAt(m.getSentAt())
                .build();
    }
}
