package com.talentiq.service.resume;

import com.talentiq.dto.resume.ResumeDto;

public interface ResumeParserService {

    /**
     * Triggers asynchronous parser pipeline for the specified resume.
     * Extracts text, invokes LLM, populates db entity, and updates candidate profile.
     *
     * @param resumeId database resume ID
     */
    void parseResumeAsync(Long resumeId);

    /**
     * Blocking call to parse resume immediately.
     */
    ResumeDto parseResume(Long resumeId);
}
