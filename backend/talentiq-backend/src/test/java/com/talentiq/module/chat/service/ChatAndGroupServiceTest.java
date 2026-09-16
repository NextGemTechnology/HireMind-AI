package com.talentiq.module.chat.service;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.dto.chat.ChatMessageDto;
import com.talentiq.dto.chat.GroupChatDto;
import com.talentiq.infrastructure.kafka.KafkaProducerService;
import com.talentiq.infrastructure.storage.FileStorageService;
import com.talentiq.model.*;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.repository.chat.*;
import com.talentiq.repository.company.CompanyCandidateVerificationRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.service.chat.ChatServiceImpl;
import com.talentiq.service.chat.GroupChatServiceImpl;
import com.talentiq.service.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Messaging RBAC & Group Invitation Security Tests")
class ChatAndGroupServiceTest {

    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private UserRepository userRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private CompanyCandidateVerificationRepository verificationRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private NotificationService notificationService;
    @Mock private FileStorageService fileStorageService;
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private KafkaProducerService kafkaProducerService;

    @InjectMocks
    private ChatServiceImpl chatService;

    @Mock private ChatGroupRepository groupRepository;
    @Mock private ChatGroupMemberRepository memberRepository;
    @Mock private GroupChatMessageRepository groupMessageRepository;
    @Mock private GroupChatInvitationRepository invitationRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private com.talentiq.service.company.CompanySecurityService companySecurityService;

    @InjectMocks
    private GroupChatServiceImpl groupChatService;

    private User candidateUser;
    private User companyAdminUser;
    private User hrUser;
    private Company company;
    private ChatGroup group;

    @BeforeEach
    void setUp() {
        company = Company.builder().id(100L).name("InstaTechnology").build();

        candidateUser = User.builder()
                .id(1L)
                .email("candidate@example.com")
                .firstName("Alice")
                .lastName("Candidate")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .build();

        companyAdminUser = User.builder()
                .id(2L)
                .email("admin@instatechnology.com")
                .firstName("Bob")
                .lastName("CEO")
                .roles(Set.of(Role.ROLE_COMPANY_ADMIN))
                .build();

        hrUser = User.builder()
                .id(3L)
                .email("recruiter@instatechnology.com")
                .firstName("Carol")
                .lastName("HR")
                .roles(Set.of(Role.ROLE_HR))
                .build();

        group = ChatGroup.builder()
                .id(50L)
                .name("Core Engineering Channel")
                .companyId(100L)
                .creatorUser(companyAdminUser)
                .active(true)
                .build();

        when(groupMessageRepository.save(any(GroupChatMessage.class))).thenAnswer(i -> {
            GroupChatMessage m = i.getArgument(0);
            m.setId(1L);
            return m;
        });
    }

    @Test
    @DisplayName("Candidate cannot message Company Executive directly")
    void shouldBlockCandidateMessagingCompanyExecutive() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(companyAdminUser));

        ChatMessageDto.SendRequest req = new ChatMessageDto.SendRequest();
        req.setReceiverId(2L);
        req.setContent("Hello CEO!");

        assertThatThrownBy(() -> chatService.sendMessage(1L, req))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Candidates cannot message Company Executives directly");
    }

    @Test
    @DisplayName("Company Executive cannot message Candidate directly")
    void shouldBlockCompanyExecutiveMessagingCandidate() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(companyAdminUser));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));

        ChatMessageDto.SendRequest req = new ChatMessageDto.SendRequest();
        req.setReceiverId(1L);
        req.setContent("Direct message from CEO");

        assertThatThrownBy(() -> chatService.sendMessage(2L, req))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Company Executives cannot message candidates directly");
    }

    @Test
    @DisplayName("Verified HR Recruiter can message Candidate")
    void shouldAllowVerifiedHrMessagingCandidate() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(hrUser));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));

        HrProfile verifiedHrProfile = HrProfile.builder()
                .id(10L)
                .user(hrUser)
                .company(company)
                .companyVerified(true)
                .build();
        when(hrProfileRepository.findByUserId(3L)).thenReturn(Optional.of(verifiedHrProfile));

        ChatMessage msg = ChatMessage.builder()
                .id(99L)
                .senderId(3L)
                .senderName("Carol HR")
                .receiverId(1L)
                .content("We reviewed your portfolio!")
                .type("TEXT")
                .sentAt(Instant.now())
                .build();
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(msg);

        ChatMessageDto.SendRequest req = new ChatMessageDto.SendRequest();
        req.setReceiverId(1L);
        req.setContent("We reviewed your portfolio!");

        ChatMessageDto.MessageResponse res = chatService.sendMessage(3L, req);
        assertThat(res).isNotNull();
        assertThat(res.getContent()).isEqualTo("We reviewed your portfolio!");
        verify(kafkaProducerService, times(1)).publishDirectMessage(any());
    }

    @Test
    @DisplayName("Unverified Candidate cannot join group via invite link")
    void shouldBlockUnverifiedCandidateFromJoiningGroup() {
        GroupChatInvitation invite = GroupChatInvitation.builder()
                .id(1L)
                .group(group)
                .inviteToken("valid-token-123")
                .createdByUser(companyAdminUser)
                .maxUses(10)
                .currentUses(0)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .active(true)
                .build();

        when(invitationRepository.findValidByToken(eq("valid-token-123"), any())).thenReturn(Optional.of(invite));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));
        when(verificationRepository.existsByCompanyIdAndCandidateUserIdAndStatus(100L, 1L, "APPROVED")).thenReturn(false);

        assertThatThrownBy(() -> groupChatService.joinGroupByInvite(1L, "valid-token-123"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only candidates with an official APPROVED verification badge");
    }

    @Test
    @DisplayName("Company-Approved Candidate successfully joins group via invite link")
    void shouldAllowApprovedCandidateToJoinGroup() {
        GroupChatInvitation invite = GroupChatInvitation.builder()
                .id(1L)
                .group(group)
                .inviteToken("valid-token-123")
                .createdByUser(companyAdminUser)
                .maxUses(10)
                .currentUses(0)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .active(true)
                .build();

        when(invitationRepository.findValidByToken(eq("valid-token-123"), any())).thenReturn(Optional.of(invite));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidateUser));
        when(verificationRepository.existsByCompanyIdAndCandidateUserIdAndStatus(100L, 1L, "APPROVED")).thenReturn(true);
        when(memberRepository.existsByGroupIdAndUserId(50L, 1L)).thenReturn(false, true);
        when(groupRepository.findById(50L)).thenReturn(Optional.of(group));
        when(memberRepository.findByGroupId(50L)).thenReturn(List.of());
        when(groupMessageRepository.findByGroupIdOrderBySentAtAsc(50L)).thenReturn(List.of());

        GroupChatDto.GroupResponse res = groupChatService.joinGroupByInvite(1L, "valid-token-123");
        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo(50L);
        verify(memberRepository, times(1)).save(any(ChatGroupMember.class));
    }

    @Test
    @DisplayName("HR cannot remove Company Executive from group")
    void shouldPreventHrFromRemovingCompanyExecutive() {
        when(groupRepository.findById(50L)).thenReturn(Optional.of(group));
        ChatGroupMember hrMember = ChatGroupMember.builder().group(group).user(hrUser).role("ADMIN").build();
        when(memberRepository.findByGroupIdAndUserId(50L, 3L)).thenReturn(Optional.of(hrMember));
        when(userRepository.findById(3L)).thenReturn(Optional.of(hrUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(companyAdminUser));

        assertThatThrownBy(() -> groupChatService.removeMember(3L, 50L, 2L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("HR recruiters cannot remove Company Executives");
    }

    @Test
    @DisplayName("Company Executive can remove HR or Candidate from group")
    void shouldAllowCompanyExecutiveToRemoveAnyMember() {
        when(groupRepository.findById(50L)).thenReturn(Optional.of(group));
        ChatGroupMember adminMember = ChatGroupMember.builder().group(group).user(companyAdminUser).role("ADMIN").build();
        when(memberRepository.findByGroupIdAndUserId(50L, 2L)).thenReturn(Optional.of(adminMember));
        when(userRepository.findById(2L)).thenReturn(Optional.of(companyAdminUser));
        when(userRepository.findById(3L)).thenReturn(Optional.of(hrUser));

        groupChatService.removeMember(2L, 50L, 3L);
        verify(memberRepository, times(1)).deleteByGroupIdAndUserId(50L, 3L);
    }

    @Test
    @DisplayName("Candidate viewing contacts receives HR details and never self")
    void shouldReturnHrDetailsWhenCandidateCallsGetContacts() {
        // Candidate is user ID 1
        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(Candidate.builder().id(5L).user(candidateUser).build()));
        when(chatMessageRepository.findContactIds(1L)).thenReturn(List.of(10L, 1L)); // 10L is HR, 1L is self

        HrProfile hr = HrProfile.builder()
                .id(10L)
                .firstName("Shriya")
                .lastName("Sharma")
                .email("shriya@ngt.com")
                .company(company)
                .designation("Recruitment Lead")
                .build();
        when(hrProfileRepository.findById(10L)).thenReturn(Optional.of(hr));
        when(chatMessageRepository.findConversation(eq(1L), eq(10L), any())).thenReturn(List.of());

        List<ChatMessageDto.ContactResponse> contacts = chatService.getContacts(1L);

        assertThat(contacts).hasSize(1);
        ChatMessageDto.ContactResponse contact = contacts.get(0);
        assertThat(contact.getUserId()).isEqualTo(10L);
        assertThat(contact.getName()).isEqualTo("Shriya Sharma");
        assertThat(contact.getEmail()).isEqualTo("shriya@ngt.com");
        assertThat(contact.getCompanyName()).isEqualTo("InstaTechnology");
        assertThat(contact.getJobTitle()).isEqualTo("Recruitment Lead");
    }
}
