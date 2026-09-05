package com.talentiq.service.recommendation;

import com.talentiq.dto.copilot.AiCopilotDto;
import com.talentiq.dto.recommendation.CareerAgentDto;

import java.util.List;

public interface CareerAgentService {

    CareerAgentDto.ChatResponse handleCandidateChatMessage(Long userId, CareerAgentDto.ChatRequest request);

    boolean isUserBlocked(Long userId);

    CareerAgentDto.ConversationResponse createConversation(Long userId, CareerAgentDto.ConversationRequest request);

    List<CareerAgentDto.ConversationResponse> listConversations(Long userId);

    List<AiCopilotDto.MessageResponse> getConversationMessages(Long userId, Long conversationId);

    void deleteConversation(Long userId, Long conversationId);

    CareerAgentDto.PreferencesDto getUserPreferences(Long userId);

    CareerAgentDto.PreferencesDto updateUserPreferences(Long userId, CareerAgentDto.PreferencesDto request);
}
