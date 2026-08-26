package com.talentiq.service.candidate;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.talentiq.common.exception.ForbiddenException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.candidate.CandidateDto;
import com.talentiq.model.*;
import com.talentiq.repository.candidate.*;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talentiq.common.enums.SkillProficiency;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CandidateServiceImpl implements CandidateService {

    private final CandidateRepository candidateRepository;
    private final CandidateSkillRepository skillRepository;
    private final CandidateExperienceRepository experienceRepository;
    private final CandidateEducationRepository educationRepository;
    private final CandidateProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private static final List<String> CURATED_INSTITUTIONS = List.of(
            "Indian Institute of Technology (IIT) Bombay",
            "Indian Institute of Technology (IIT) Delhi",
            "Indian Institute of Technology (IIT) Madras",
            "Indian Institute of Technology (IIT) Kharagpur",
            "Indian Institute of Technology (IIT) Kanpur",
            "Indian Institute of Technology (IIT) Roorkee",
            "Indian Institute of Technology (IIT) Guwahati",
            "BITS Pilani (Birla Institute of Technology and Science)",
            "International Institute of Information Technology (IIIT) Hyderabad",
            "International Institute of Information Technology (IIIT) Bangalore",
            "National Institute of Technology (NIT) Trichy",
            "National Institute of Technology (NIT) Karnataka, Surathkal",
            "National Institute of Technology (NIT) Warangal",
            "Delhi Technological University (DTU)",
            "Netaji Subhas University of Technology (NSUT)",
            "Vellore Institute of Technology (VIT)",
            "Manipal Institute of Technology (MIT)",
            "Thapar Institute of Engineering and Technology",
            "SRM Institute of Science and Technology",
            "Amity University",
            "Delhi University (DU)",
            "Jawaharlal Nehru University (JNU)",
            "Banaras Hindu University (BHU)",
            "Anna University, Chennai",
            "Jadavpur University, Kolkata",
            "Pune University (Savitribai Phule Pune University)",
            "Mumbai University",
            "Massachusetts Institute of Technology (MIT), USA",
            "Stanford University, USA",
            "Harvard University, USA",
            "University of California, Berkeley (UC Berkeley)",
            "Carnegie Mellon University (CMU)",
            "University of Cambridge, UK",
            "University of Oxford, UK",
            "National University of Singapore (NUS)",
            "Nanyang Technological University (NTU), Singapore",
            "ETH Zurich, Switzerland",
            "University of Toronto, Canada",
            "University of Waterloo, Canada",
            "Central Board of Secondary Education (CBSE)",
            "Indian Certificate of Secondary Education (ICSE / ISC)",
            "Delhi Public School (DPS)",
            "Kendriya Vidyalaya (KV)",
            "DAV Public School",
            "St. Xavier's High School",
            "Army Public School",
            "State Board of Secondary & Higher Secondary Education"
    );

    @Override
    @Transactional(readOnly = true)
    public CandidateDto.Response getProfileByUserId(Long userId) {
        Candidate candidate = getOrCreateCandidate(userId);
        return mapToResponse(candidate);
    }

    @Override
    @Transactional(readOnly = true)
    public CandidateDto.Response getProfileById(Long candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "id", candidateId));
        return mapToResponse(candidate);
    }

    @Override
    public CandidateDto.Response updateProfile(Long userId, CandidateDto.ProfileUpdateRequest request) {
        Candidate candidate = getOrCreateCandidate(userId);

        if (request.getHeadline() != null) candidate.setHeadline(request.getHeadline());
        if (request.getBio() != null) candidate.setBio(request.getBio());
        if (request.getLocation() != null) candidate.setLocation(request.getLocation());
        if (request.getGithubUrl() != null) candidate.setGithubUrl(request.getGithubUrl());
        if (request.getLinkedinUrl() != null) candidate.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getWebsiteUrl() != null) candidate.setWebsiteUrl(request.getWebsiteUrl());
        if (request.getYearsExperience() != null) candidate.setYearsExperience(request.getYearsExperience());
        if (request.getCurrentTitle() != null) candidate.setCurrentTitle(request.getCurrentTitle());
        if (request.getCurrentCompany() != null) candidate.setCurrentCompany(request.getCurrentCompany());
        if (request.getExpectedSalary() != null) candidate.setExpectedSalary(request.getExpectedSalary());
        if (request.getAvailability() != null) candidate.setAvailability(request.getAvailability());
        if (request.getExperienceLevel() != null) candidate.setExperienceLevel(request.getExperienceLevel());
        if (request.getOpenToWork() != null) candidate.setOpenToWork(request.getOpenToWork());

        candidate.calculateProfileCompletion();
        Candidate updated = candidateRepository.save(candidate);
        return mapToResponse(updated);
    }

    @Override
    public CandidateDto.Response addSkill(Long userId, CandidateDto.SkillRequest request) {
        Candidate candidate = getOrCreateCandidate(userId);

        // Check if skill already exists
        boolean exists = candidate.getSkills().stream()
                .anyMatch(s -> s.getSkillName().equalsIgnoreCase(request.getSkillName()));
        if (exists) {
            return mapToResponse(candidate);
        }

        SkillProficiency proficiency = request.getProficiency() != null
                ? request.getProficiency()
                : SkillProficiency.INTERMEDIATE;

        CandidateSkill skill = CandidateSkill.builder()
                .candidate(candidate)
                .skillName(request.getSkillName().trim())
                .proficiency(proficiency)
                .years(request.getYears() != null ? request.getYears() : 1)
                .primary(Boolean.TRUE.equals(request.getPrimary()))
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        skill = skillRepository.save(skill);
        candidate.getSkills().add(skill);
        candidate.calculateProfileCompletion();
        Candidate updated = candidateRepository.save(candidate);
        return mapToResponse(updated);
    }

    @Override
    public void deleteSkill(Long userId, Long skillId) {
        Candidate candidate = getOrCreateCandidate(userId);
        CandidateSkill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateSkill", "id", skillId));
        if (!skill.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("Unauthorized to delete this skill");
        }
        candidate.getSkills().removeIf(s -> s.getId() != null && s.getId().equals(skillId));
        try {
            skillRepository.deleteById(skillId);
        } catch (Exception ignored) {}
        candidate.calculateProfileCompletion();
        candidateRepository.save(candidate);
    }

    @Override
    public CandidateDto.Response addExperience(Long userId, CandidateDto.ExperienceRequest request) {
        Candidate candidate = getOrCreateCandidate(userId);

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();

        CandidateExperience exp = CandidateExperience.builder()
                .candidate(candidate)
                .company(request.getCompany())
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .employmentType(request.getEmploymentType())
                .startDate(startDate)
                .endDate(request.getEndDate())
                .current(Boolean.TRUE.equals(request.getCurrent()))
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        exp = experienceRepository.save(exp);
        candidate.getExperiences().add(exp);
        candidate.calculateProfileCompletion();
        Candidate updated = candidateRepository.save(candidate);
        return mapToResponse(updated);
    }

    @Override
    public void deleteExperience(Long userId, Long experienceId) {
        Candidate candidate = getOrCreateCandidate(userId);
        CandidateExperience exp = experienceRepository.findById(experienceId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateExperience", "id", experienceId));
        if (!exp.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("Unauthorized to delete this experience");
        }
        candidate.getExperiences().removeIf(e -> e.getId() != null && e.getId().equals(experienceId));
        try {
            experienceRepository.deleteById(experienceId);
        } catch (Exception ignored) {}
        candidate.calculateProfileCompletion();
        candidateRepository.save(candidate);
    }

    @Override
    public CandidateDto.Response addEducation(Long userId, CandidateDto.EducationRequest request) {
        Candidate candidate = getOrCreateCandidate(userId);

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();

        CandidateEducation edu = CandidateEducation.builder()
                .candidate(candidate)
                .institution(request.getInstitution())
                .degree(request.getDegree())
                .fieldOfStudy(request.getFieldOfStudy())
                .gpa(request.getGpa())
                .startDate(startDate)
                .endDate(request.getEndDate())
                .current(Boolean.TRUE.equals(request.getCurrent()))
                .description(request.getDescription())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        edu = educationRepository.save(edu);
        candidate.getEducations().add(edu);
        candidate.calculateProfileCompletion();
        Candidate updated = candidateRepository.save(candidate);
        return mapToResponse(updated);
    }

    @Override
    public CandidateDto.Response updateEducation(Long userId, Long educationId, CandidateDto.EducationRequest request) {
        Candidate candidate = getOrCreateCandidate(userId);
        CandidateEducation edu = educationRepository.findById(educationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateEducation", "id", educationId));

        if (!edu.getCandidate().getId().equals(candidate.getId())) {
            throw new RuntimeException("Unauthorized to modify this education record");
        }

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();
        edu.setInstitution(request.getInstitution());
        edu.setDegree(request.getDegree());
        edu.setFieldOfStudy(request.getFieldOfStudy());
        edu.setGpa(request.getGpa());
        edu.setStartDate(startDate);
        edu.setEndDate(request.getEndDate());
        edu.setCurrent(Boolean.TRUE.equals(request.getCurrent()));
        edu.setDescription(request.getDescription());
        if (request.getDisplayOrder() != null) {
            edu.setDisplayOrder(request.getDisplayOrder());
        }

        educationRepository.save(edu);
        candidate.calculateProfileCompletion();
        Candidate updated = candidateRepository.save(candidate);
        return mapToResponse(updated);
    }

    @Override
    public void deleteEducation(Long userId, Long educationId) {
        Candidate candidate = getOrCreateCandidate(userId);
        CandidateEducation edu = educationRepository.findById(educationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateEducation", "id", educationId));
        if (!edu.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("Unauthorized to delete this education");
        }
        candidate.getEducations().removeIf(e -> e.getId() != null && e.getId().equals(educationId));
        try {
            educationRepository.deleteById(educationId);
        } catch (Exception ignored) {}
        candidate.calculateProfileCompletion();
        candidateRepository.save(candidate);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> searchInstitutions(String query) {
        if (query == null || query.trim().length() < 2) {
            return CURATED_INSTITUTIONS.stream().limit(15).toList();
        }
        String q = query.trim().toLowerCase();
        Set<String> results = new LinkedHashSet<>();

        // 1. Search database
        try {
            List<String> dbMatches = educationRepository.searchInstitutions(q, PageRequest.of(0, 10));
            results.addAll(dbMatches);
        } catch (Exception e) {
            log.warn("Database institution search error: {}", e.getMessage());
        }

        // 2. Search curated catalog
        CURATED_INSTITUTIONS.stream()
                .filter(inst -> inst.toLowerCase().contains(q))
                .limit(15)
                .forEach(results::add);

        return new ArrayList<>(results);
    }

    @Override
    public CandidateDto.Response addProject(Long userId, CandidateDto.ProjectRequest request) {
        Candidate candidate = getOrCreateCandidate(userId);

        String techStackJson = null;
        if (request.getTechStack() != null) {
            try {
                techStackJson = objectMapper.writeValueAsString(request.getTechStack());
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize techStack: {}", e.getMessage());
            }
        }

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();

        CandidateProject proj = CandidateProject.builder()
                .candidate(candidate)
                .title(request.getTitle())
                .description(request.getDescription())
                .url(request.getUrl())
                .githubUrl(request.getGithubUrl())
                .techStack(techStackJson)
                .startDate(startDate)
                .endDate(request.getEndDate())
                .featured(Boolean.TRUE.equals(request.getFeatured()))
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        proj = projectRepository.save(proj);
        candidate.getProjects().add(proj);
        candidate.calculateProfileCompletion();
        Candidate updated = candidateRepository.save(candidate);
        return mapToResponse(updated);
    }

    @Override
    public void deleteProject(Long userId, Long projectId) {
        Candidate candidate = getOrCreateCandidate(userId);
        CandidateProject proj = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProject", "id", projectId));
        if (!proj.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("Unauthorized to delete this project");
        }
        candidate.getProjects().removeIf(p -> p.getId() != null && p.getId().equals(projectId));
        try {
            projectRepository.deleteById(projectId);
        } catch (Exception ignored) {}
        candidate.calculateProfileCompletion();
        candidateRepository.save(candidate);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CandidateDto.Response> searchCandidates(String skill, Pageable pageable) {
        Page<Candidate> candidates;
        if (skill != null && !skill.isBlank()) {
            candidates = candidateRepository.findBySkillName(skill, pageable);
        } else {
            candidates = candidateRepository.findAllOpenToWork(pageable);
        }
        Page<CandidateDto.Response> responsePage = candidates.map(this::mapToResponse);
        return PagedResponse.of(responsePage);
    }

    // Helper
    private Candidate getOrCreateCandidate(Long userId) {
        return candidateRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
            Candidate newCandidate = Candidate.builder()
                    .user(user)
                    .profileCompletion(20)
                    .build();
            return candidateRepository.save(newCandidate);
        });
    }

    private CandidateDto.Response mapToResponse(Candidate candidate) {
        User user = candidate.getUser();

        List<CandidateDto.SkillResponse> skillResponses = candidate.getSkills().stream().map(s ->
                CandidateDto.SkillResponse.builder()
                        .id(s.getId())
                        .skillName(s.getSkillName())
                        .proficiency(s.getProficiency())
                        .years(s.getYears())
                        .primary(s.isPrimary())
                        .displayOrder(s.getDisplayOrder())
                        .build()
        ).toList();

        List<CandidateDto.ExperienceResponse> expResponses = candidate.getExperiences().stream().map(e ->
                CandidateDto.ExperienceResponse.builder()
                        .id(e.getId())
                        .company(e.getCompany())
                        .title(e.getTitle())
                        .description(e.getDescription())
                        .location(e.getLocation())
                        .employmentType(e.getEmploymentType())
                        .startDate(e.getStartDate())
                        .endDate(e.getEndDate())
                        .current(e.isCurrent())
                        .displayOrder(e.getDisplayOrder())
                        .build()
        ).toList();

        List<CandidateDto.EducationResponse> eduResponses = candidate.getEducations().stream().map(e ->
                CandidateDto.EducationResponse.builder()
                        .id(e.getId())
                        .institution(e.getInstitution())
                        .degree(e.getDegree())
                        .fieldOfStudy(e.getFieldOfStudy())
                        .gpa(e.getGpa())
                        .startDate(e.getStartDate())
                        .endDate(e.getEndDate())
                        .current(e.isCurrent())
                        .description(e.getDescription())
                        .displayOrder(e.getDisplayOrder())
                        .build()
        ).toList();

        List<CandidateDto.ProjectResponse> projResponses = candidate.getProjects().stream().map(p -> {
            List<String> stack = Collections.emptyList();
            if (p.getTechStack() != null) {
                try {
                    stack = objectMapper.readValue(p.getTechStack(), new TypeReference<List<String>>() {});
                } catch (Exception ignored) {}
            }
            return CandidateDto.ProjectResponse.builder()
                    .id(p.getId())
                    .title(p.getTitle())
                    .description(p.getDescription())
                    .url(p.getUrl())
                    .githubUrl(p.getGithubUrl())
                    .techStack(stack)
                    .startDate(p.getStartDate())
                    .endDate(p.getEndDate())
                    .featured(p.isFeatured())
                    .displayOrder(p.getDisplayOrder())
                    .build();
        }).toList();

        return CandidateDto.Response.builder()
                .id(candidate.getId())
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .headline(candidate.getHeadline())
                .bio(candidate.getBio())
                .location(candidate.getLocation())
                .githubUrl(candidate.getGithubUrl())
                .linkedinUrl(candidate.getLinkedinUrl())
                .websiteUrl(candidate.getWebsiteUrl())
                .yearsExperience(candidate.getYearsExperience())
                .currentTitle(candidate.getCurrentTitle())
                .currentCompany(candidate.getCurrentCompany())
                .expectedSalary(candidate.getExpectedSalary())
                .availability(candidate.getAvailability())
                .experienceLevel(candidate.getExperienceLevel())
                .openToWork(candidate.isOpenToWork())
                .profileCompletion(candidate.getProfileCompletion())
                .skills(skillResponses)
                .experiences(expResponses)
                .educations(eduResponses)
                .projects(projResponses)
                .build();
    }
}
