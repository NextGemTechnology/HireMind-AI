package com.talentiq.ai.service;
import com.talentiq.model.Candidate;
import com.talentiq.ai.model.*;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.config.AppProperties;
import com.talentiq.ai.model.AiSecurityEvent;
import com.talentiq.ai.repository.AiSecurityEventRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiSecurityGateway {

    private final AiSecurityEventRepository securityEventRepository;
    private final StringRedisTemplate redisTemplate;
    private final AppProperties appProperties;
    private final AiUsageLogService usageLogService;

    private static final String REDIS_RATE_LIMIT_PREFIX = "ai:ratelimit:";
    private static final String REDIS_WARNINGS_PREFIX = "ai:security:warnings:";
    private static final String REDIS_BLOCKS_PREFIX = "ai:security:blocks:";

    // ── 1. Prompt Injection & Jailbreak Patterns ─────────────────────────────
    private static final Pattern INJECTION_PATTERNS = Pattern.compile(
            "(?i)(" +
            // Instruction overrides & system prompt leakage
            "ignore\\s+(all\\s+)?(previous|prior|above)\\s+(instructions|prompts|rules|commands)|" +
            "disregard\\s+(all\\s+)?(previous|prior|above)\\s+(instructions|prompts|rules|commands)|" +
            "forget\\s+(all\\s+)?(previous|prior|above)\\s+(instructions|prompts|rules|commands)|" +
            "override\\s+(system|developer|core)\\s+(instructions|prompt|rules)|" +
            "repeat\\s+(your\\s+)?(system\\s+prompt|initial\\s+instructions|system\\s+message)|" +
            "reveal\\s+(your\\s+)?(system\\s+prompt|secret\\s+key|api\\s+key|rules)|" +
            "what\\s+are\\s+your\\s+(exact\\s+)?(instructions|system\\s+prompts)|" +
            // Jailbreak personas & role hijacking
            "you\\s+are\\s+now\\s+(dan|unrestricted|jailbroken|godmode)|" +
            "act\\s+as\\s+(an?\\s+)?(unfiltered|unrestricted|jailbroken|dan)|" +
            "developer\\s+mode\\s+(enabled|on|activate)|" +
            // System tag / prompt delimiter attacks
            "<\\|im_start\\|>|<\\|im_end\\|>|<\\|system\\|>|\\[INST\\]|\\[/INST\\]|<<SYS>>|<system>|</system>|" +
            // Destructive commands & database probing
            "drop\\s+(database|table|schema|user)|delete\\s+from|truncate\\s+table|alter\\s+table|" +
            "xp_cmdshell|exec\\s*\\(|rm\\s+-rf|chmod\\s+|/etc/passwd|bash\\s+-i|cmd\\.exe|powershell|" +
            "give\\s+me\\s+(all\\s+)?(passwords|database\\s+password|admin\\s+credentials|secret\\s+key|api\\s+key|env\\s+variables)" +
            ")"
    );

    // ── 2. Code Generation & Non-Career Patterns ─────────────────────────────
    private static final Pattern NON_CAREER_CODE_PATTERN = Pattern.compile(
            "(?i)(give\\s+me\\s+code|write\\s+(a\\s+)?(code|program|script|function|class|algorithm|leetcode)|" +
            "debug\\s+(this\\s+)?code|python\\s+code|java\\s+code|c\\+\\+\\s+code|javascript\\s+code|" +
            "react\\s+component\\s+code|write\\s+html|fibonacci|calculator\\s+app|binary\\s+search\\s+code|" +
            "recipe\\s+for|capital\\s+of)"
    );

    // ── 3. PII & Secret Patterns ─────────────────────────────────────────────
    private static final Pattern SSN_PATTERN = Pattern.compile("\\b\\d{3}-\\d{2}-\\d{4}\\b");
    private static final Pattern CREDIT_CARD_PATTERN = Pattern.compile("\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b");
    private static final Pattern BEARER_TOKEN_PATTERN = Pattern.compile("(?i)bearer\\s+[A-Za-z0-9._~+/-]+={0,2}");
    private static final Pattern API_KEY_PATTERN = Pattern.compile("(?i)(api[_-]?key|secret|password|passwd)\\s*[:=]\\s*['\"]?[A-Za-z0-9-_]{8,}['\"]?");

    // ── 4. HTML / Script Output Sanitization ─────────────────────────────────
    private static final Pattern UNSAFE_OUTPUT_HTML = Pattern.compile(
            "(?i)<\\s*(script|iframe|object|embed|applet|meta|link|style)[^>]*>.*?</\\s*\\1\\s*>|" +
            "<\\s*(script|iframe|object|embed|applet|meta|link|style)[^>]*/>|" +
            "javascript:|vbscript:|data:text/html",
            Pattern.DOTALL
    );

    @Data
    @Builder
    public static class ValidationResult {
        private boolean valid;
        private String sanitizedInput;
        private boolean isBlocked;
        private Instant blockedUntil;
        private int warningCount;
        private String rejectionReason;
        private String refusalReply;
    }

    /**
     * Central entrypoint to validate, rate-limit, and sanitize an input prompt before LLM invocation.
     */
    public ValidationResult validatePrompt(Long userId, String rawPrompt, String agentType, String ipAddress) {
        // Step 1: Check if user is currently blocked
        if (isUserBlocked(userId)) {
            Instant blockedUntil = getUserBlockExpiry(userId);
            return ValidationResult.builder()
                    .valid(false)
                    .isBlocked(true)
                    .blockedUntil(blockedUntil)
                    .rejectionReason("USER_BLOCKED")
                    .refusalReply("🚫 Access Suspended: Your access to the HireMind AI Agent has been temporarily blocked for 24 hours due to security policy violations. Access will be restored after: " + blockedUntil)
                    .build();
        }

        // Step 2: Rate Limiting
        if (!checkRateLimit(userId)) {
            recordSecurityEvent(userId, "RATE_LIMITED", sanitizeSample(rawPrompt), "RATE_LIMIT_EXCEEDED", "LOW", ipAddress);
            return ValidationResult.builder()
                    .valid(false)
                    .isBlocked(false)
                    .rejectionReason("RATE_LIMITED")
                    .refusalReply("⚠️ Rate limit reached. You can make up to 10 AI requests per minute. Please pause for a few seconds before trying again.")
                    .build();
        }

        // Step 3: Daily Token Quota Check
        int dailyLimit = appProperties.getAi().getAgents().getMaxTokensPerUserDaily();
        if (usageLogService.isDailyQuotaExceeded(userId, dailyLimit)) {
            recordSecurityEvent(userId, "QUOTA_EXCEEDED", sanitizeSample(rawPrompt), "DAILY_TOKEN_LIMIT", "LOW", ipAddress);
            return ValidationResult.builder()
                    .valid(false)
                    .isBlocked(false)
                    .rejectionReason("QUOTA_EXCEEDED")
                    .refusalReply("📊 Daily AI quota reached. Your allocated daily AI generation limit has been reached. Quota resets at 00:00 UTC.")
                    .build();
        }

        // Step 4: Input Normalization & Length Capping
        String sanitized = normalizeAndClean(rawPrompt, 6000);

        // Step 5: Prompt Injection / Malicious Probe Detection
        Matcher injectionMatcher = INJECTION_PATTERNS.matcher(sanitized);
        if (injectionMatcher.find()) {
            String patternFound = injectionMatcher.group(0);
            int warnings = incrementWarnings(userId);

            if (warnings >= 2) {
                Instant blockedUntil = Instant.now().plus(24, ChronoUnit.HOURS);
                blockUser(userId, blockedUntil);
                recordSecurityEvent(userId, "USER_BLOCKED", sanitizeSample(sanitized), patternFound, "CRITICAL", ipAddress);

                return ValidationResult.builder()
                        .valid(false)
                        .isBlocked(true)
                        .blockedUntil(blockedUntil)
                        .warningCount(warnings)
                        .rejectionReason("PROMPT_INJECTION_BLOCK")
                        .refusalReply("🚫 Account Temporarily Blocked: Repeated security violation detected (destructive instruction, prompt injection, or credential probe). AI access is suspended for 24 hours.")
                        .build();
            } else {
                recordSecurityEvent(userId, "PROMPT_INJECTION", sanitizeSample(sanitized), patternFound, "HIGH", ipAddress);
                return ValidationResult.builder()
                        .valid(false)
                        .isBlocked(false)
                        .warningCount(warnings)
                        .rejectionReason("PROMPT_INJECTION_WARNING")
                        .refusalReply("⚠️ Security Alert (Warning 1 of 1): System override instructions, jailbreaks, and credential queries are strictly prohibited on HireMind. One more violation will result in an automatic 24-hour block.")
                        .build();
            }
        }

        // Step 6: Non-Career Code Refusal (For Candidate Career Agent)
        if ("CANDIDATE_CAREER_AGENT".equalsIgnoreCase(agentType)) {
            boolean isCodeRequest = NON_CAREER_CODE_PATTERN.matcher(sanitized).find();
            boolean isJobSearch = sanitized.toLowerCase().matches(".*\\b(job|developer|engineer|roles|openings|hiring|remote|intern|manager|frontend|backend|full stack|devops|suggest|find|apply)\\b.*");

            if (isCodeRequest && !isJobSearch) {
                return ValidationResult.builder()
                        .valid(false)
                        .isBlocked(false)
                        .rejectionReason("REFUSAL_NON_CAREER")
                        .refusalReply("I am your dedicated HireMind AI Career Advisor. I specialize strictly in career guidance, resume matching, and job discovery. I do not generate or debug code or answer non-career queries. Would you like me to find open positions matching your stack?")
                        .build();
            }
        }

        // Step 7: PII Minimization on User Input
        sanitized = minimizePii(sanitized);

        return ValidationResult.builder()
                .valid(true)
                .sanitizedInput(sanitized)
                .isBlocked(false)
                .build();
    }

    /**
     * Binary level validation of uploaded resume files (PDF and DOCX magic bytes).
     */
    public boolean validateResumeBinary(InputStream inputStream, String declaredContentType, String filename) {
        try {
            byte[] header = new byte[8];
            int read = inputStream.read(header);
            if (read < 4) return false;

            // PDF Magic Number: %PDF (0x25 0x50 0x44 0x46)
            boolean isPdf = (header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46);

            // DOCX / ZIP Magic Number: PK\x03\x04 (0x50 0x4B 0x03 0x04)
            boolean isZipDocx = (header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04);

            String lowerName = filename != null ? filename.toLowerCase() : "";
            if (lowerName.endsWith(".pdf") && !isPdf) {
                log.warn("MIME Spoofing detected: File named '{}' does not match PDF magic bytes", filename);
                return false;
            }
            if (lowerName.endsWith(".docx") && !isZipDocx) {
                log.warn("MIME Spoofing detected: File named '{}' does not match DOCX magic bytes", filename);
                return false;
            }
            return isPdf || isZipDocx;
        } catch (Exception e) {
            log.error("Failed to inspect file magic bytes: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Scan extracted raw text from PDF/DOCX for hidden injection patterns or invisible characters.
     */
    public boolean scanExtractedResumeText(Long userId, String rawText, String ipAddress) {
        if (rawText == null || rawText.isBlank()) return true;

        // Check for prompt injections hidden in resumes
        Matcher matcher = INJECTION_PATTERNS.matcher(rawText);
        if (matcher.find()) {
            String pattern = matcher.group(0);
            recordSecurityEvent(userId, "HIDDEN_TEXT_ALERT", "Resume embedded prompt injection: " + sanitizeSample(pattern), pattern, "HIGH", ipAddress);
            log.warn("Prompt injection detected in candidate resume for userId {}: {}", userId, pattern);
            return false;
        }
        return true;
    }

    /**
     * Sanitize LLM generated output before returning it to frontend or persisting in DB.
     * Enforces response length constraints and removes unsafe HTML tags.
     */
    public String sanitizeOutput(String llmOutput) {
        if (llmOutput == null || llmOutput.isBlank()) return "";

        // Strip dangerous HTML/scripts
        String clean = UNSAFE_OUTPUT_HTML.matcher(llmOutput).replaceAll("");

        // Strip any leaked tokens or secrets
        clean = BEARER_TOKEN_PATTERN.matcher(clean).replaceAll("[REDACTED_TOKEN]");
        clean = API_KEY_PATTERN.matcher(clean).replaceAll("[REDACTED_SECRET]");

        // Enforce 4-15 lines constraint for chat conversational output if too long
        String[] lines = clean.split("\r?\n");
        if (lines.length > 20) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 18; i++) {
                sb.append(lines[i]).append("\n");
            }
            sb.append("\n*(Response truncated for brevity. Ask for specific details!)*");
            clean = sb.toString();
        }

        return clean.trim();
    }

    public String minimizePii(String text) {
        if (text == null) return "";
        String s = SSN_PATTERN.matcher(text).replaceAll("[REDACTED_SSN]");
        s = CREDIT_CARD_PATTERN.matcher(s).replaceAll("[REDACTED_CARD]");
        s = BEARER_TOKEN_PATTERN.matcher(s).replaceAll("[REDACTED_TOKEN]");
        s = API_KEY_PATTERN.matcher(s).replaceAll("[REDACTED_SECRET]");
        return s;
    }

    public String normalizeAndClean(String input, int maxLen) {
        if (input == null) return "";
        // Remove zero-width characters and control codes (except newline and tab)
        String cleaned = input.replaceAll("[\u200B\u200C\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]", "");
        if (cleaned.length() > maxLen) {
            cleaned = cleaned.substring(0, maxLen);
        }
        return cleaned.trim();
    }

    private boolean checkRateLimit(Long userId) {
        int maxRpm = appProperties.getAi().getAgents().getMaxRequestsPerMinute();
        if (maxRpm <= 0) maxRpm = 10;

        long currentMinute = System.currentTimeMillis() / 60000;
        String key = REDIS_RATE_LIMIT_PREFIX + userId + ":" + currentMinute;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, 90, TimeUnit.SECONDS);
            }
            return count != null && count <= maxRpm;
        } catch (Exception e) {
            log.warn("Redis rate limit check bypassed due to error: {}", e.getMessage());
            return true;
        }
    }

    public boolean isUserBlocked(Long userId) {
        try {
            String val = redisTemplate.opsForValue().get(REDIS_BLOCKS_PREFIX + userId);
            return val != null;
        } catch (Exception e) {
            return false;
        }
    }

    public Instant getUserBlockExpiry(Long userId) {
        try {
            String val = redisTemplate.opsForValue().get(REDIS_BLOCKS_PREFIX + userId);
            if (val != null) {
                return Instant.ofEpochMilli(Long.parseLong(val));
            }
        } catch (Exception ignored) {}
        return Instant.now().plus(24, ChronoUnit.HOURS);
    }

    public void blockUser(Long userId, Instant until) {
        try {
            long ttlSeconds = ChronoUnit.SECONDS.between(Instant.now(), until);
            if (ttlSeconds > 0) {
                redisTemplate.opsForValue().set(REDIS_BLOCKS_PREFIX + userId, String.valueOf(until.toEpochMilli()), ttlSeconds, TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            log.error("Failed to persist user block to Redis: {}", e.getMessage());
        }
    }

    private int incrementWarnings(Long userId) {
        try {
            String key = REDIS_WARNINGS_PREFIX + userId;
            Long count = redisTemplate.opsForValue().increment(key);
            redisTemplate.expire(key, 24, TimeUnit.HOURS);
            return count != null ? count.intValue() : 1;
        } catch (Exception e) {
            return 1;
        }
    }

    private void recordSecurityEvent(Long userId, String eventType, String sample, String pattern, String severity, String ip) {
        try {
            AiSecurityEvent event = AiSecurityEvent.builder()
                    .userId(userId)
                    .eventType(eventType)
                    .inputSample(sample)
                    .detectionPattern(pattern)
                    .severity(severity)
                    .ipAddress(ip)
                    .createdAt(Instant.now())
                    .build();
            securityEventRepository.save(event);
        } catch (Exception e) {
            log.error("Failed to record AI security event: {}", e.getMessage());
        }
    }

    private String sanitizeSample(String input) {
        if (input == null) return null;
        String sample = minimizePii(input);
        return sample.length() > 200 ? sample.substring(0, 200) + "..." : sample;
    }
}
