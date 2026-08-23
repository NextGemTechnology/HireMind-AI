package com.talentiq.service.recommendation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.candidate.CandidateDto;
import com.talentiq.dto.job.JobDto;
import com.talentiq.dto.recommendation.RecommendationDto;
import com.talentiq.dto.recommendation.RecommendationStatusDto;
import com.talentiq.model.*;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.recommendation.JobRecommendationRepository;
import com.talentiq.repository.resume.ResumeParsedDataRepository;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.service.company.CompanyServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.talentiq.common.constants.AppConstants.CACHE_RECOMMENDATIONS;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RecommendationServiceImpl implements RecommendationService {

    private final JobRecommendationRepository recommendationRepository;
    private final CandidateRepository candidateRepository;
    private final JobRepository jobRepository;
    private final HrProfileRepository hrProfileRepository;
    private final ResumeRepository resumeRepository;
    private final ResumeParsedDataRepository resumeParsedDataRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<RecommendationDto> getJobRecommendationsForCandidate(Long userId, Pageable pageable) {
        return getJobRecommendationsForCandidate(userId, null, false, pageable);
    }

    @Override
    public PagedResponse<RecommendationDto> getJobRecommendationsForCandidate(
            Long userId,
            Double minScore,
            boolean refresh,
            Pageable pageable) {

        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        BigDecimal minScoreBigDecimal = minScore != null ? BigDecimal.valueOf(minScore) : null;

        // Force recalculation if requested or if no recommendations exist yet
        long existingCount = recommendationRepository.countByCandidateIdActive(candidate.getId());
        if (refresh || existingCount == 0) {
            log.info("Recalculating recommendations for candidate ID {}. refresh={}, existingCount={}",
                    candidate.getId(), refresh, existingCount);
            recalculateAllRecommendationsForCandidate(candidate.getId());
        }

        Page<JobRecommendation> recommendations = recommendationRepository.findAllByCandidateIdAndMinScore(
                candidate.getId(),
                minScoreBigDecimal,
                pageable
        );

        return PagedResponse.of(recommendations.map(this::mapToDtoWithJob));
    }

    @Override
    @Transactional(readOnly = true)
    public RecommendationStatusDto getRecommendationStatusForCandidate(Long userId) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        Optional<Resume> activeResumeOpt = resumeRepository.findByCandidateIdAndActiveTrue(candidate.getId());
        List<Resume> allResumes = resumeRepository.findAllByCandidateId(candidate.getId());

        boolean hasResume = activeResumeOpt.isPresent() || !allResumes.isEmpty();
        Resume activeResume = activeResumeOpt.orElse(allResumes.isEmpty() ? null : allResumes.get(0));

        List<String> extractedSkills = Collections.emptyList();
        if (activeResume != null) {
            Optional<ResumeParsedData> parsedDataOpt = resumeParsedDataRepository.findByResumeId(activeResume.getId());
            if (parsedDataOpt.isPresent() && parsedDataOpt.get().getExtractedSkills() != null) {
                extractedSkills = parseJsonList(parsedDataOpt.get().getExtractedSkills());
            }
        }

        List<String> candidateSkills = candidate.getSkills() != null
                ? candidate.getSkills().stream().map(CandidateSkill::getSkillName).collect(Collectors.toList())
                : Collections.emptyList();

        long totalMatches = recommendationRepository.countByCandidateIdActive(candidate.getId());
        long highMatches = recommendationRepository.countByCandidateIdAndMinScore(candidate.getId(), BigDecimal.valueOf(85.0));

        return RecommendationStatusDto.builder()
                .hasResume(hasResume)
                .resumeCount(allResumes.size())
                .activeResumeName(activeResume != null ? (activeResume.getOriginalName() != null ? activeResume.getOriginalName() : activeResume.getVersionName()) : null)
                .activeResumeId(activeResume != null ? activeResume.getId() : null)
                .parseStatus(activeResume != null ? activeResume.getParseStatus() : "NONE")
                .isParsed(activeResume != null && activeResume.isParsed())
                .profileSkillsCount(candidateSkills.size())
                .candidateSkills(candidateSkills)
                .extractedSkills(extractedSkills)
                .profileCompletion(candidate.getProfileCompletion() != null ? candidate.getProfileCompletion() : 0)
                .totalMatchingJobs(totalMatches)
                .highMatchJobsCount(highMatches)
                .build();
    }

    @Override
    public void recalculateAllRecommendationsForCandidate(Long candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "id", candidateId));

        Page<Job> activeJobs = jobRepository.findActiveJobs(Pageable.unpaged());
        for (Job job : activeJobs.getContent()) {
            calculateAndSaveMatch(candidate, job);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<RecommendationDto> getCandidateRecommendationsForJob(Long hrUserId, Long jobId, Pageable pageable) {
        HrProfile hrProfile = hrProfileRepository.findByUserId(hrUserId)
                .orElseThrow(() -> new ForbiddenException("Only company HR members can view candidate recommendations"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getCompany().getId().equals(hrProfile.getCompany().getId())) {
            throw new ForbiddenException("You cannot view recommendations for another company's job posting");
        }

        Page<JobRecommendation> recommendations = recommendationRepository.findAllByJobIdActive(jobId, pageable);

        if (recommendations.isEmpty()) {
            log.info("No cached recommendations found for job {}. Generating recommendations.", jobId);
            generateInitialRecommendationsForJob(job);
            recommendations = recommendationRepository.findAllByJobIdActive(jobId, pageable);
        }

        return PagedResponse.of(recommendations.map(this::mapToDtoWithCandidate));
    }

    @Override
    public RecommendationDto computeRecommendationMatch(Long candidateId, Long jobId) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "id", candidateId));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        JobRecommendation recommendation = calculateAndSaveMatch(candidate, job);
        return mapToDtoFull(recommendation);
    }

    // ── Algorithm Matching Engine ─────────────────────────────────────────────

    private JobRecommendation calculateAndSaveMatch(Candidate candidate, Job job) {
        // Collect Candidate Skills from both Profile and Parsed Resume Data
        Set<String> candidateSkillSet = new HashSet<>();
        if (candidate.getSkills() != null) {
            candidate.getSkills().forEach(s -> candidateSkillSet.add(normalizeSkill(s.getSkillName())));
        }

        // Add extracted resume skills if active resume exists
        Optional<Resume> activeResume = resumeRepository.findByCandidateIdAndActiveTrue(candidate.getId());
        if (activeResume.isPresent()) {
            resumeParsedDataRepository.findByResumeId(activeResume.get().getId()).ifPresent(parsed -> {
                List<String> resumeSkills = parseJsonList(parsed.getExtractedSkills());
                for (String rs : resumeSkills) {
                    candidateSkillSet.add(normalizeSkill(rs));
                }
            });
        }

        // 1. Skill Score Calculation (45% Weight)
        List<JobSkill> requiredSkills = job.getRequiredSkills() != null ? job.getRequiredSkills() : Collections.emptyList();
        List<String> matching = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        double skillScoreVal = 100.0;
        if (!requiredSkills.isEmpty()) {
            double totalWeight = 0;
            double matchedWeight = 0;

            for (JobSkill js : requiredSkills) {
                String rawName = js.getSkillName();
                String normalizedReq = normalizeSkill(rawName);
                double weight = js.isRequired() ? 2.0 : 1.0;
                totalWeight += weight;

                boolean isMatched = isSkillMatched(normalizedReq, candidateSkillSet);
                if (isMatched) {
                    matching.add(rawName);
                    matchedWeight += weight;
                } else {
                    missing.add(rawName);
                }
            }

            if (totalWeight > 0) {
                skillScoreVal = (matchedWeight / totalWeight) * 100.0;
            }
        }

        // 2. Experience Score Calculation (25% Weight)
        double expScoreVal = 80.0;
        int candidateYears = candidate.getYearsExperience() != null ? candidate.getYearsExperience() : 0;
        int estimatedRequiredYears = switch (job.getExperienceLevel() != null ? job.getExperienceLevel() : com.talentiq.common.enums.ExperienceLevel.MID) {
            case ENTRY -> 0;
            case JUNIOR -> 1;
            case MID -> 3;
            case SENIOR -> 5;
            case LEAD, PRINCIPAL -> 8;
            default -> 3;
        };

        if (estimatedRequiredYears == 0) {
            expScoreVal = 100.0;
        } else {
            expScoreVal = Math.min(100.0, Math.max(40.0, ((double) candidateYears / estimatedRequiredYears) * 100.0));
        }

        // 3. Title / Role Fit (15% Weight)
        double roleScoreVal = 75.0;
        String candTitle = (candidate.getCurrentTitle() != null ? candidate.getCurrentTitle() : "") + " "
                + (candidate.getHeadline() != null ? candidate.getHeadline() : "");
        candTitle = candTitle.toLowerCase();
        String jobTitle = job.getTitle() != null ? job.getTitle().toLowerCase() : "";

        if (!jobTitle.isBlank() && !candTitle.isBlank()) {
            String[] jobTokens = jobTitle.split("\\s+");
            int matches = 0;
            for (String token : jobTokens) {
                if (token.length() > 2 && candTitle.contains(token)) {
                    matches++;
                }
            }
            if (matches > 0) {
                roleScoreVal = Math.min(100.0, 75.0 + (matches * 10.0));
            }
        }

        // 4. Location / Remote Score (15% Weight)
        double locScoreVal = 60.0;
        if (job.isRemote()) {
            locScoreVal = 100.0;
        } else if (candidate.getLocation() != null && job.getLocation() != null) {
            String cLoc = candidate.getLocation().toLowerCase().trim();
            String jLoc = job.getLocation().toLowerCase().trim();
            if (cLoc.contains(jLoc) || jLoc.contains(cLoc)) {
                locScoreVal = 100.0;
            } else if (job.isHybrid()) {
                locScoreVal = 85.0;
            }
        } else if (job.isHybrid()) {
            locScoreVal = 80.0;
        }

        // Overall Weighted Average: 45% Skills, 25% Experience, 15% Role, 15% Location
        double overallScoreVal = (skillScoreVal * 0.45) + (expScoreVal * 0.25) + (roleScoreVal * 0.15) + (locScoreVal * 0.15);

        // Insights & Recommendations
        List<String> strengths = new ArrayList<>();
        List<String> improvements = new ArrayList<>();

        if (skillScoreVal >= 85) {
            strengths.add("Exceptional core technical stack alignment (" + matching.size() + " skills matched)");
        } else if (skillScoreVal >= 65) {
            strengths.add("Solid foundation in required skills (" + matching.size() + " skills matched)");
        }

        if (expScoreVal >= 90) {
            strengths.add("Directly meets required seniority level (" + candidateYears + "+ years)");
        }

        if (locScoreVal >= 95) {
            strengths.add(job.isRemote() ? "100% Remote Opportunity — Perfect location flexibility" : "Ideal geographical location alignment");
        }

        if (!missing.isEmpty()) {
            improvements.add("Recommended additions: " + String.join(", ", missing.subList(0, Math.min(3, missing.size()))));
        }
        if (expScoreVal < 70) {
            improvements.add("Highlight hands-on project accomplishments to offset formal years of experience");
        }

        JobRecommendation recommendation = recommendationRepository.findByCandidateIdAndJobId(candidate.getId(), job.getId())
                .orElseGet(() -> JobRecommendation.builder().candidate(candidate).job(job).build());

        try {
            recommendation.setOverallScore(BigDecimal.valueOf(overallScoreVal).setScale(2, RoundingMode.HALF_UP));
            recommendation.setSkillScore(BigDecimal.valueOf(skillScoreVal).setScale(2, RoundingMode.HALF_UP));
            recommendation.setExperienceScore(BigDecimal.valueOf(expScoreVal).setScale(2, RoundingMode.HALF_UP));
            recommendation.setEducationScore(BigDecimal.valueOf(roleScoreVal).setScale(2, RoundingMode.HALF_UP));
            recommendation.setLocationScore(BigDecimal.valueOf(locScoreVal).setScale(2, RoundingMode.HALF_UP));
            recommendation.setSemanticScore(BigDecimal.valueOf(roleScoreVal).setScale(2, RoundingMode.HALF_UP));
            recommendation.setMatchingSkills(objectMapper.writeValueAsString(matching));
            recommendation.setMissingSkills(objectMapper.writeValueAsString(missing));
            recommendation.setStrengths(objectMapper.writeValueAsString(strengths));
            recommendation.setImprovementSuggestions(objectMapper.writeValueAsString(improvements));
            recommendation.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        } catch (Exception ignored) {}

        return recommendationRepository.save(recommendation);
    }

    private String normalizeSkill(String skill) {
        if (skill == null) return "";
        return skill.toLowerCase().trim()
                .replace(".", "")
                .replace(" ", "")
                .replace("-", "")
                .replace("/", "");
    }

    private boolean isSkillMatched(String reqSkill, Set<String> candidateSkills) {
        if (candidateSkills.contains(reqSkill)) return true;
        for (String cs : candidateSkills) {
            if (cs.contains(reqSkill) || reqSkill.contains(cs)) {
                return true;
            }
        }
        return false;
    }

    private void generateInitialRecommendationsForJob(Job job) {
        Page<Candidate> candidates = candidateRepository.findAll(Pageable.unpaged());
        for (Candidate candidate : candidates.getContent()) {
            calculateAndSaveMatch(candidate, job);
        }
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private RecommendationDto mapToDtoWithJob(JobRecommendation rec) {
        return RecommendationDto.builder()
                .id(rec.getId())
                .job(mapJobToResponse(rec.getJob()))
                .overallScore(rec.getOverallScore())
                .skillScore(rec.getSkillScore())
                .experienceScore(rec.getExperienceScore())
                .educationScore(rec.getEducationScore())
                .locationScore(rec.getLocationScore())
                .semanticScore(rec.getSemanticScore())
                .matchingSkills(parseJsonList(rec.getMatchingSkills()))
                .missingSkills(parseJsonList(rec.getMissingSkills()))
                .strengths(parseJsonList(rec.getStrengths()))
                .improvementSuggestions(parseJsonList(rec.getImprovementSuggestions()))
                .build();
    }

    private RecommendationDto mapToDtoWithCandidate(JobRecommendation rec) {
        return RecommendationDto.builder()
                .id(rec.getId())
                .candidate(mapCandidateToResponse(rec.getCandidate()))
                .overallScore(rec.getOverallScore())
                .skillScore(rec.getSkillScore())
                .experienceScore(rec.getExperienceScore())
                .educationScore(rec.getEducationScore())
                .locationScore(rec.getLocationScore())
                .semanticScore(rec.getSemanticScore())
                .matchingSkills(parseJsonList(rec.getMatchingSkills()))
                .missingSkills(parseJsonList(rec.getMissingSkills()))
                .strengths(parseJsonList(rec.getStrengths()))
                .improvementSuggestions(parseJsonList(rec.getImprovementSuggestions()))
                .build();
    }

    private RecommendationDto mapToDtoFull(JobRecommendation rec) {
        return RecommendationDto.builder()
                .id(rec.getId())
                .job(mapJobToResponse(rec.getJob()))
                .candidate(mapCandidateToResponse(rec.getCandidate()))
                .overallScore(rec.getOverallScore())
                .skillScore(rec.getSkillScore())
                .experienceScore(rec.getExperienceScore())
                .educationScore(rec.getEducationScore())
                .locationScore(rec.getLocationScore())
                .semanticScore(rec.getSemanticScore())
                .matchingSkills(parseJsonList(rec.getMatchingSkills()))
                .missingSkills(parseJsonList(rec.getMissingSkills()))
                .strengths(parseJsonList(rec.getStrengths()))
                .improvementSuggestions(parseJsonList(rec.getImprovementSuggestions()))
                .build();
    }

    private List<String> parseJsonList(String json) {
        if (json == null) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
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

    private CandidateDto.Response mapCandidateToResponse(Candidate candidate) {
        User user = candidate.getUser();
        return CandidateDto.Response.builder()
                .id(candidate.getId())
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .headline(candidate.getHeadline())
                .location(candidate.getLocation())
                .build();
    }
}
