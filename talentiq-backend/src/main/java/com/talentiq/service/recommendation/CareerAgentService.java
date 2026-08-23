package com.talentiq.service.recommendation;

import com.talentiq.dto.recommendation.CareerAgentDto;

public interface CareerAgentService {

    CareerAgentDto.ChatResponse handleCandidateChatMessage(Long userId, CareerAgentDto.ChatRequest request);

    boolean isUserBlocked(Long userId);
}
