package com.talentiq.service.copilot;

import com.talentiq.dto.copilot.AiCopilotDto;

import java.util.List;

public interface AiCopilotService {

    AiCopilotDto.ConversationResponse createConversation(Long hrUserId, AiCopilotDto.ConversationRequest request);

    AiCopilotDto.MessageResponse sendMessage(Long hrUserId, Long conversationId, String content);

    List<AiCopilotDto.ConversationResponse> listConversations(Long hrUserId);

    List<AiCopilotDto.MessageResponse> getMessages(Long hrUserId, Long conversationId);

    void deleteConversation(Long hrUserId, Long conversationId);

    void clearConversation(Long hrUserId, Long conversationId);

    AiCopilotDto.ConfigResponse getConfig(Long hrUserId);

    AiCopilotDto.ConfigResponse updateConfig(Long hrUserId, AiCopilotDto.ConfigUpdateRequest request);
}
