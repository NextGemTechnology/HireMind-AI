package com.talentiq.ai.service;
import com.talentiq.ai.model.*;

import com.talentiq.ai.dto.DeveloperAgentDto;

import java.util.List;

public interface DeveloperAgentService {

    /**
     * Process an engineering query with customized developer personas, prompt parameters,
     * optional live cluster diagnostics context, and dedicated model selection.
     */
    DeveloperAgentDto.DeveloperChatResponse processDeveloperPrompt(Long developerUserId, DeveloperAgentDto.DeveloperChatRequest request);

    /**
     * Get list of supported developer engineering modes, default system prompts, and guidance.
     */
    List<DeveloperAgentDto.DeveloperModeInfo> getAvailableModes();
}
