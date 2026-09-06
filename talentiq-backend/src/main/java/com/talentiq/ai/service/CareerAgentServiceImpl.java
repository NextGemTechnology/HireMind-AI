package com.talentiq.ai.service;
import com.talentiq.model.Candidate;
import com.talentiq.ai.model.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.config.AppProperties;
import com.talentiq.ai.dto.AiCopilotDto;
import com.talentiq.dto.job.JobDto;
import com.talentiq.ai.dto.CareerAgentDto;
import com.talentiq.model.*;
import com.talentiq.ai.repository.AiUserPreferencesRepository;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.ai.repository.AiConversationRepository;
import com.talentiq.ai.repository.AiMessageRepository;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.recommendation.JobRecommendationRepository;
import com.talentiq.repository.resume.ResumeParsedDataRepository;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.ai.service.AiModelFactory;
import com.talentiq.ai.service.AiSecurityGateway;
import com.talentiq.ai.service.AiUsageLogService;
import com.talentiq.service.company.CompanyServiceImpl;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CareerAgentServiceImpl implements CareerAgentService {

    private final JobRepository jobRepository;
    private final CandidateRepository candidateRepository;
    private final ResumeRepository resumeRepository;
    private final ResumeParsedDataRepository resumeParsedDataRepository;
    private final JobRecommendationRepository recommendationRepository;
    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;
    private final AiUserPreferencesRepository userPreferencesRepository;
    private final AiSecurityGateway aiSecurityGateway;
    private final AiModelFactory aiModelFactory;
    private final AiUsageLogService aiUsageLogService;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    @Override
    public boolean isUserBlocked(Long userId) {
        return aiSecurityGateway.isUserBlocked(userId);
    }

    @Override
    public CareerAgentDto.ChatResponse handleCandidateChatMessage(Long userId, CareerAgentDto.ChatRequest request) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        String rawMsg = request.getMessage() != null ? request.getMessage().trim() : "";

        // ── 1. AI Security Gateway Validation ─────────────────────────────────
        AiSecurityGateway.ValidationResult valResult = aiSecurityGateway.validatePrompt(
                userId, rawMsg, "CANDIDATE_CAREER_AGENT", "127.0.0.1"
        );

        if (!valResult.isValid()) {
            return CareerAgentDto.ChatResponse.builder()
                    .intent(valResult.getRejectionReason())
                    .isBlocked(valResult.isBlocked())
                    .blockedUntil(valResult.getBlockedUntil())
                    .warningCount(valResult.getWarningCount())
                    .reply(valResult.getRefusalReply())
                    .build();
        }

        String sanitizedMsg = valResult.getSanitizedInput();

        // ── 2. Conversation & Privacy Session Management ───────────────────────
        AiConversation conversation = null;
        if (request.getConversationId() != null) {
            conversation = conversationRepository.findByIdAndCandidateId(request.getConversationId(), candidate.getId())
                    .orElse(null);
        }

        boolean storeChat = userPreferencesRepository.findByUserId(userId)
                .map(AiUserPreferences::isChatStorageEnabled)
                .orElse(true);

        if (conversation != null && storeChat) {
            AiMessage userMsg = AiMessage.builder()
                    .conversation(conversation)
                    .role("USER")
                    .content(sanitizedMsg)
                    .build();
            messageRepository.save(userMsg);
            conversation.incrementMessageCount();
        }

        // ── 3. Intent Detection & Routing ─────────────────────────────────────
        CareerAgentDto.ChatResponse response;
        if (isResumeMatchQuery(sanitizedMsg)) {
            response = handleResumeMatchQuery(candidate);
        } else if (isJobOrRoleQuery(sanitizedMsg) || sanitizedMsg.toLowerCase().contains("suggest") || sanitizedMsg.toLowerCase().contains("job")) {
            response = handleJobSearchQuery(candidate, sanitizedMsg);
        } else {
            response = handleGeneralCareerQueryWithLlm(candidate, sanitizedMsg, request.getHistory(), userId);
        }

        // ── 4. Output Sanitization & Assistant Message Persistence ────────────
        String sanitizedReply = aiSecurityGateway.sanitizeOutput(response.getReply());
        response.setReply(sanitizedReply);

        if (conversation != null && storeChat) {
            int promptTokens = Math.max(1, sanitizedMsg.length() / 4);
            int compTokens = Math.max(1, sanitizedReply.length() / 4);
            int totalTokens = promptTokens + compTokens;

            AiMessage assistantMsg = AiMessage.builder()
                    .conversation(conversation)
                    .role("ASSISTANT")
                    .content(sanitizedReply)
                    .tokensUsed(totalTokens)
                    .model(appProperties.getAi().getAgents().getCandidateModel())
                    .build();
            messageRepository.save(assistantMsg);
            conversation.incrementMessageCount();
            conversationRepository.save(conversation);

            response.setConversationId(conversation.getId());
        }

        return response;
    }

    private boolean isResumeMatchQuery(String msg) {
        String lower = msg.toLowerCase();
        return lower.contains("resume") || lower.contains("based on my") || lower.contains("fit my profile")
                || lower.contains("profile match") || lower.contains("my skills match");
    }

    private boolean isJobOrRoleQuery(String msg) {
        String lower = msg.toLowerCase();
        return lower.contains("job") || lower.contains("developer") || lower.contains("engineer")
                || lower.contains("roles") || lower.contains("openings") || lower.contains("vacancies")
                || lower.contains("hiring") || lower.contains("remote") || lower.contains("intern")
                || lower.contains("architect") || lower.contains("manager") || lower.contains("frontend")
                || lower.contains("backend") || lower.contains("full stack") || lower.contains("devops");
    }

    private CareerAgentDto.ChatResponse handleResumeMatchQuery(Candidate candidate) {
        Optional<Resume> activeResume = resumeRepository.findByCandidateIdAndActiveTrue(candidate.getId());
        List<Resume> allResumes = resumeRepository.findAllByCandidateId(candidate.getId());

        if (activeResume.isEmpty() && allResumes.isEmpty()) {
            return CareerAgentDto.ChatResponse.builder()
                    .intent("RESUME_MATCH")
                    .requiresResume(true)
                    .reply("📄 Resume Check: I analyzed your account and found no active resume uploaded in your Resume Center (`/portfolio`). Please upload your resume (PDF/DOCX) using the upload zone so I can extract your skill matrix and recommend 85%+ matched roles.")
                    .build();
        }

        Resume resume = activeResume.orElse(allResumes.get(0));
        String resumeName = resume.getOriginalName() != null ? resume.getOriginalName() : resume.getVersionName();

        Page<JobRecommendation> recPage = recommendationRepository.findAllByCandidateIdAndMinScore(
                candidate.getId(),
                BigDecimal.valueOf(85.0),
                PageRequest.of(0, 10)
        );

        List<JobRecommendation> recsList = (recPage != null && recPage.getContent() != null) ? recPage.getContent() : Collections.emptyList();
        if (recsList.size() < 10) {
            Page<JobRecommendation> allRecs = recommendationRepository.findAllByCandidateIdActive(
                    candidate.getId(),
                    PageRequest.of(0, 10)
            );
            if (allRecs != null && allRecs.getContent() != null && !allRecs.isEmpty()) {
                recsList = allRecs.getContent();
            }
        }

        List<JobDto.Response> jobs = recsList.stream()
                .map(r -> mapJobToResponse(r.getJob()))
                .collect(Collectors.toList());

        String replyMsg = String.format(
                "✨ Resume Analysis Complete: I examined your active resume **%s** and cross-referenced your verified skill matrix against all active HR job postings. Here are the top %d best-matching positions (85%%+ compatibility prioritized) for you:",
                resumeName,
                jobs.size()
        );

        return CareerAgentDto.ChatResponse.builder()
                .intent("RESUME_MATCH")
                .reply(replyMsg)
                .suggestedJobs(jobs)
                .requiresResume(false)
                .build();
    }

    private CareerAgentDto.ChatResponse handleJobSearchQuery(Candidate candidate, String query) {
        String keyword = extractKeywordFromQuery(query);

        Page<Job> jobPage;
        if (keyword != null && !keyword.isBlank()) {
            jobPage = jobRepository.searchActiveJobsByKeyword(keyword, PageRequest.of(0, 10));
        } else {
            jobPage = jobRepository.findRecentActiveJobs(PageRequest.of(0, 10));
        }

        if (jobPage.isEmpty()) {
            jobPage = jobRepository.findRecentActiveJobs(PageRequest.of(0, 10));
        }

        List<JobDto.Response> jobs = jobPage.getContent().stream()
                .map(this::mapJobToResponse)
                .collect(Collectors.toList());

        String roleLabel = (keyword != null && !keyword.isBlank()) ? keyword : "latest software engineering";
        String replyMsg = String.format(
                "🚀 Here are the top %d %s jobs recently posted by HR recruiters on TalentIQ. You can apply directly, message the hiring team, or inspect full role details below:",
                jobs.size(),
                roleLabel
        );

        return CareerAgentDto.ChatResponse.builder()
                .intent("SKILL_SEARCH")
                .extractedRole(keyword)
                .reply(replyMsg)
                .suggestedJobs(jobs)
                .build();
    }

    private CareerAgentDto.ChatResponse handleGeneralCareerQueryWithLlm(Candidate candidate, String query,
                                                                         List<CareerAgentDto.ChatMessageItem> history,
                                                                         Long userId) {
        String modelName = appProperties.getAi().getAgents().getCandidateModel();
        ChatLanguageModel model = aiModelFactory.getModel(modelName, 0.7);

        if (model == null) {
            return CareerAgentDto.ChatResponse.builder()
                    .intent("GENERAL_CAREER")
                    .reply("I'm your HireMind AI Career Advisor! You can ask me to:\n"
                            + "• **\"Suggest me Java developer jobs\"** (or React, Python, DevOps, Cloud)\n"
                            + "• **\"Based on my resume suggest me jobs\"** (analyzes your resume for 85%+ matches)\n"
                            + "• **\"Show remote engineering jobs\"**\n"
                            + "Tell me what roles or tech stack you'd like to explore!")
                    .build();
        }

        // Build candidate's privacy-safe contextual profile
        StringBuilder systemPrompt = new StringBuilder();
        systemPrompt.append("You are HireMind AI Career Advisor. You are a friendly, encouraging, and highly professional career mentor.\n");
        systemPrompt.append("RULES & SECURITY:\n");
        systemPrompt.append("- You strictly assist candidates with career guidance, job matching, resume tips, and interview preparation.\n");
        systemPrompt.append("- Never generate or debug code, scripts, or non-career content.\n");
        systemPrompt.append("- Never make recommendations based on protected attributes (gender, race, age, religion, disability, marital status).\n");
        systemPrompt.append("- Keep conversational responses between 4 and 12 concise lines.\n\n");

        systemPrompt.append("<candidate_profile>\n");
        if (candidate.getUser() != null) {
            systemPrompt.append("Name: ").append(candidate.getUser().getFirstName()).append("\n");
        }
        if (candidate.getCurrentTitle() != null) {
            systemPrompt.append("Current Role: ").append(candidate.getCurrentTitle()).append("\n");
        }
        if (candidate.getSkills() != null && !candidate.getSkills().isEmpty()) {
            systemPrompt.append("Verified Skills: ")
                    .append(candidate.getSkills().stream().map(CandidateSkill::getSkillName).collect(Collectors.joining(", ")))
                    .append("\n");
        }
        systemPrompt.append("</candidate_profile>\n");

        long startMs = System.currentTimeMillis();
        try {
            List<ChatMessage> messages = new ArrayList<>();
            messages.add(new SystemMessage(systemPrompt.toString()));

            if (history != null && !history.isEmpty()) {
                int start = Math.max(0, history.size() - 6);
                for (int i = start; i < history.size(); i++) {
                    CareerAgentDto.ChatMessageItem item = history.get(i);
                    if ("user".equalsIgnoreCase(item.getRole())) {
                        messages.add(new UserMessage(item.getContent()));
                    } else {
                        messages.add(new dev.langchain4j.data.message.AiMessage(item.getContent()));
                    }
                }
            }

            messages.add(new UserMessage(query));

            String reply = model.generate(messages).content().text();
            int latencyMs = (int) (System.currentTimeMillis() - startMs);

            int promptTokens = Math.max(1, query.length() / 4);
            int compTokens = Math.max(1, reply.length() / 4);
            aiUsageLogService.logUsage(userId, null, "CAREER_AGENT", modelName, promptTokens, compTokens, latencyMs, "SUCCESS", null);

            return CareerAgentDto.ChatResponse.builder()
                    .intent("GENERAL_CAREER")
                    .reply(reply)
                    .build();
        } catch (Exception e) {
            log.error("Career Agent LLM call failed: {}", e.getMessage());
            return CareerAgentDto.ChatResponse.builder()
                    .intent("GENERAL_CAREER")
                    .reply("I can help you review job matches, improve your resume, or prepare for technical interviews. Try asking 'Suggest me remote React jobs' or 'Based on my resume suggest me jobs'!")
                    .build();
        }
    }

    private String extractKeywordFromQuery(String query) {
        String cleaned = query.toLowerCase()
                .replaceAll("(?i)(suggest\\s+(me\\s+)?|find\\s+(me\\s+)?|show\\s+(me\\s+)?|search\\s+(for\\s+)?|give\\s+(me\\s+)?|what\\s+are\\s+the\\s+|recent\\s+|latest\\s+|available\\s+|openings\\s+(for\\s+)?|jobs?\\s*(for|in)?|positions?\\s*(for|in)?|roles?\\s*(for|in)?)", " ")
                .trim();

        if (cleaned.isBlank() || cleaned.length() < 2) return null;
        return cleaned;
    }

    private JobDto.Response mapJobToResponse(Job job) {
        List<JobDto.SkillDto> skillsList = Collections.emptyList();
        if (job.getRequiredSkills() != null) {
            skillsList = job.getRequiredSkills().stream()
                    .map(s -> JobDto.SkillDto.builder()
                            .skillName(s.getSkillName())
                            .required(s.isRequired())
                            .displayOrder(s.getDisplayOrder())
                            .build())
                    .collect(Collectors.toList());
        }

        return JobDto.Response.builder()
                .id(job.getId())
                .company(CompanyServiceImpl.mapToResponse(job.getCompany()))
                .postedById(job.getPostedBy() != null ? job.getPostedBy().getId() : null)
                .title(job.getTitle())
                .slug(job.getSlug())
                .description(job.getDescription())
                .responsibilities(job.getResponsibilities())
                .requirements(job.getRequirements())
                .location(job.getLocation())
                .jobType(job.getJobType())
                .remote(job.isRemote())
                .hybrid(job.isHybrid())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .salaryCurrency(job.getSalaryCurrency())
                .salaryPeriod(job.getSalaryPeriod())
                .experienceLevel(job.getExperienceLevel())
                .status(job.getStatus())
                .openings(job.getOpenings())
                .requiredSkills(skillsList)
                .createdAt(job.getCreatedAt())
                .build();
    }

    // ── Candidate Conversation Management ─────────────────────────────────────

    @Override
    public CareerAgentDto.ConversationResponse createConversation(Long userId, CareerAgentDto.ConversationRequest request) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        AiConversation conversation = AiConversation.builder()
                .candidate(candidate)
                .userType("CANDIDATE")
                .title(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle().trim() : "Career Advisory Session")
                .contextType("CAREER")
                .chatEnabled(true)
                .build();

        AiConversation saved = conversationRepository.save(conversation);
        return CareerAgentDto.ConversationResponse.builder()
                .id(saved.getId())
                .title(saved.getTitle())
                .messageCount(saved.getMessageCount())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CareerAgentDto.ConversationResponse> listConversations(Long userId) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        return conversationRepository.findAllByCandidateIdAndArchivedFalseOrderByUpdatedAtDesc(candidate.getId()).stream()
                .map(c -> CareerAgentDto.ConversationResponse.builder()
                        .id(c.getId())
                        .title(c.getTitle())
                        .messageCount(c.getMessageCount())
                        .createdAt(c.getCreatedAt())
                        .updatedAt(c.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiCopilotDto.MessageResponse> getConversationMessages(Long userId, Long conversationId) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        AiConversation conv = conversationRepository.findByIdAndCandidateId(conversationId, candidate.getId())
                .orElseThrow(() -> new ForbiddenException("Access denied: Not your conversation session"));

        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId()).stream()
                .map(m -> AiCopilotDto.MessageResponse.builder()
                        .id(m.getId())
                        .role(m.getRole())
                        .content(m.getContent())
                        .createdAt(m.getCreatedAt())
                        .tokensUsed(m.getTokensUsed())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public void deleteConversation(Long userId, Long conversationId) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        AiConversation conv = conversationRepository.findByIdAndCandidateId(conversationId, candidate.getId())
                .orElseThrow(() -> new ForbiddenException("Access denied: Not your conversation session"));

        conv.setArchived(true);
        conversationRepository.save(conv);
    }

    // ── AI Privacy & Preferences ──────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CareerAgentDto.PreferencesDto getUserPreferences(Long userId) {
        AiUserPreferences prefs = userPreferencesRepository.findByUserId(userId)
                .orElseGet(() -> AiUserPreferences.builder()
                        .userId(userId)
                        .chatStorageEnabled(true)
                        .retentionDays(90)
                        .dataSharingConsent(false)
                        .build());

        return CareerAgentDto.PreferencesDto.builder()
                .chatStorageEnabled(prefs.isChatStorageEnabled())
                .retentionDays(prefs.getRetentionDays())
                .dataSharingConsent(prefs.isDataSharingConsent())
                .build();
    }

    @Override
    public CareerAgentDto.PreferencesDto updateUserPreferences(Long userId, CareerAgentDto.PreferencesDto request) {
        AiUserPreferences prefs = userPreferencesRepository.findByUserId(userId)
                .orElseGet(() -> AiUserPreferences.builder().userId(userId).build());

        prefs.setChatStorageEnabled(request.isChatStorageEnabled());
        if (request.getRetentionDays() > 0) {
            prefs.setRetentionDays(request.getRetentionDays());
        }
        prefs.setDataSharingConsent(request.isDataSharingConsent());

        AiUserPreferences saved = userPreferencesRepository.save(prefs);
        return CareerAgentDto.PreferencesDto.builder()
                .chatStorageEnabled(saved.isChatStorageEnabled())
                .retentionDays(saved.getRetentionDays())
                .dataSharingConsent(saved.isDataSharingConsent())
                .build();
    }
}
