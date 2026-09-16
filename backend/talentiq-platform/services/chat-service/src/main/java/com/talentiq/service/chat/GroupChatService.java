package com.talentiq.service.chat;

import com.talentiq.dto.chat.GroupChatDto;

import java.util.List;

public interface GroupChatService {

    GroupChatDto.GroupResponse createGroup(Long currentUserId, GroupChatDto.CreateGroupRequest request);

    List<GroupChatDto.GroupResponse> getUserGroups(Long currentUserId);

    GroupChatDto.GroupResponse getGroupDetails(Long currentUserId, Long groupId);

    GroupChatDto.GroupResponse addMembers(Long currentUserId, Long groupId, GroupChatDto.AddMembersRequest request);

    void removeMember(Long currentUserId, Long groupId, Long targetUserId);

    List<GroupChatDto.MessageResponse> getGroupMessages(Long currentUserId, Long groupId);

    GroupChatDto.MessageResponse sendGroupMessage(Long currentUserId, Long groupId, GroupChatDto.SendMessageRequest request);

    GroupChatDto.MessageResponse sendGroupFileMessage(Long currentUserId, Long groupId, org.springframework.web.multipart.MultipartFile file);

    GroupChatDto.InviteResponse createInvitation(Long currentUserId, Long groupId, GroupChatDto.CreateInviteRequest request);

    GroupChatDto.GroupResponse joinGroupByInvite(Long currentUserId, String inviteToken);
}
