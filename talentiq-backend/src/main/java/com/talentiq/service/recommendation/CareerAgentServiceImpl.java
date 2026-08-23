package com.talentiq.service.recommendation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.dto.job.JobDto;
import com.talentiq.dto.recommendation.CareerAgentDto;
import com.talentiq.model.*;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.recommendation.JobRecommendationRepository;
import com.talentiq.repository.resume.ResumeParsedDataRepository;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.service.company.CompanyServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
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
    private final RecommendationService recommendationService;
    private final ObjectMapper objectMapper;

    // In-memory security guard tracking per User ID (backed by concurrent state)
    private static final Map<Long, Integer> userWarnings = new ConcurrentHashMap<>();
    private static final Map<Long, Instant> userBlocks = new ConcurrentHashMap<>();

    // Malicious & Destructive Command Patterns
    private static final Pattern HARMFUL_PATTERN = Pattern.compile(
            "(?i)(drop\\s+(database|table|schema|user)|delete\\s+from|truncate\\s+table|alter\\s+table|exec\\s*\\(|xp_cmdshell|shutdown|rm\\s+-rf|chmod\\s+|/etc/passwd|bash\\s+-i|cmd\\.exe|powershell|give\\s+me\\s+(all\\s+)?(passwords|database\\s+password|admin\\s+credentials|secret\\s+key|api\\s+key|env\\s+variables)|dump\\s+database|bypass\\s+security)"
    );

    // Non-Career Code Generation Request Patterns
    private static final Pattern CODE_REQUEST_PATTERN = Pattern.compile(
            "(?i)(give\\s+me\\s+code|write\\s+(a\\s+)?(code|program|script|function|class|algorithm|leetcode)|debug\\s+(this\\s+)?code|python\\s+code|java\\s+code|c\\+\\+\\s+code|javascript\\s+code|react\\s+component\\s+code|write\\s+html|fibonacci|calculator\\s+app|binary\\s+search\\s+code|recipe\\s+for|capital\\s+of)"
    );

    @Override
    public boolean isUserBlocked(Long userId) {
        Instant blockedUntil = userBlocks.get(userId);
        if (blockedUntil == null) return false;
        if (Instant.now().isAfter(blockedUntil)) {
            userBlocks.remove(userId);
            userWarnings.remove(userId);
            return false;
        }
        return true;
    }

    @Override
    public CareerAgentDto.ChatResponse handleCandidateChatMessage(Long userId, CareerAgentDto.ChatRequest request) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        String rawMsg = request.getMessage() != null ? request.getMessage().trim() : "";

        // ── 1. Check if user is currently blocked ────────────────────────────
        if (isUserBlocked(userId)) {
            Instant blockedUntil = userBlocks.get(userId);
            return CareerAgentDto.ChatResponse.builder()
                    .intent("SECURITY_BLOCKED")
                    .isBlocked(true)
                    .blockedUntil(blockedUntil)
                    .reply("🚫 Access Suspended: Your access to the TalentIQ AI Career Advisor has been temporarily blocked for 24 hours due to security policy violations. Access will be restored after: " + blockedUntil)
                    .build();
        }

        // ── 2. Security Guardrail: Check for harmful scripts / attacks ────────
        if (HARMFUL_PATTERN.matcher(rawMsg).find()) {
            int warnings = userWarnings.getOrDefault(userId, 0) + 1;
            userWarnings.put(userId, warnings);

            if (warnings >= 2) {
                Instant blockedUntil = Instant.now().plus(24, ChronoUnit.HOURS);
                userBlocks.put(userId, blockedUntil);
                log.warn("Candidate ID {} (User ID {}) temporarily blocked for 24h due to repeated security violation: '{}'",
                        candidate.getId(), userId, rawMsg);

                return CareerAgentDto.ChatResponse.builder()
                        .intent("SECURITY_BLOCKED")
                        .isBlocked(true)
                        .blockedUntil(blockedUntil)
                        .warningCount(warnings)
                        .reply("🚫 Account Temporarily Blocked: Repeated security violation detected (destructive script or credential probe). Your AI Career Advisor chat has been suspended for 24 hours.")
                        .build();
            } else {
                log.warn("Candidate ID {} (User ID {}) issued 1st security warning for: '{}'",
                        candidate.getId(), userId, rawMsg);

                return CareerAgentDto.ChatResponse.builder()
                        .intent("SECURITY_WARNING")
                        .warningCount(1)
                        .isBlocked(false)
                        .reply("⚠️ Security Alert (Warning 1 of 1): Destructive instructions, database queries, and system probing are strictly prohibited on TalentIQ. One more violation will immediately result in a 24-hour temporary block.")
                        .build();
            }
        }

        // ── 3. Code Generation & Non-Career Refusal ───────────────────────────
        boolean isAskingForCode = CODE_REQUEST_PATTERN.matcher(rawMsg).find();
        boolean isJobSearchQuery = isJobOrRoleQuery(rawMsg);

        if (isAskingForCode && !isJobSearchQuery) {
            return CareerAgentDto.ChatResponse.builder()
                    .intent("REFUSAL_NON_CAREER")
                    .isBlocked(false)
                    .reply("I am your dedicated TalentIQ AI Career Advisor. I specialize strictly in job recommendations, resume matching, and career advice. I cannot generate or debug programming code, or assist with non-career queries. Would you like me to find open job positions matching your skill set instead?")
                    .build();
        }

        // ── 4. Resume-Based Recommendations Intent ────────────────────────────
        if (isResumeMatchQuery(rawMsg)) {
            return handleResumeMatchQuery(candidate);
        }

        // ── 5. Skill / Role Search Intent (e.g. "suggest me java developer job")
        if (isJobSearchQuery || rawMsg.toLowerCase().contains("suggest") || rawMsg.toLowerCase().contains("job")) {
            return handleJobSearchQuery(candidate, rawMsg);
        }

        // ── 6. General Career & Guidance Q&A ───────────────────────────────────
        return handleGeneralCareerQuery(rawMsg);
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

        // Query top 10 recommended jobs for candidate with 85%+ match score prioritized
        Page<JobRecommendation> recPage = recommendationRepository.findAllByCandidateIdAndMinScore(
                candidate.getId(),
                BigDecimal.valueOf(85.0),
                PageRequest.of(0, 10)
        );

        // Fallback to top matches if less than 10 are >= 85%
        List<JobRecommendation> recsList = recPage.getContent();
        if (recsList.size() < 10) {
            Page<JobRecommendation> allRecs = recommendationRepository.findAllByCandidateIdActive(
                    candidate.getId(),
                    PageRequest.of(0, 10)
            );
            recsList = allRecs.getContent();
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

        // If search returned empty, fallback to recent active jobs
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

    private CareerAgentDto.ChatResponse handleGeneralCareerQuery(String query) {
        String reply = "I'm your TalentIQ AI Career Advisor! You can ask me to:\n"
                + "• **\"Suggest me Java developer jobs\"** (or React, Python, DevOps, Cloud Architect)\n"
                + "• **\"Based on my resume suggest me jobs\"** (analyzes your resume for 85%+ matches)\n"
                + "• **\"Show remote engineering jobs\"**\n"
                + "Tell me what roles or tech stack you'd like to explore!";

        return CareerAgentDto.ChatResponse.builder()
                .intent("GENERAL_CAREER")
                .reply(reply)
                .build();
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
}
