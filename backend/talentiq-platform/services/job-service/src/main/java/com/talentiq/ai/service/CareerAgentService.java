package com.talentiq.ai.service;
import com.talentiq.model.Candidate;
import com.talentiq.ai.model.*;

import com.talentiq.ai.dto.AiCopilotDto;
import com.talentiq.ai.dto.CareerAgentDto;

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
