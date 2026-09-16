package com.talentiq.service.candidate;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.candidate.CandidateDto;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CandidateService {

    CandidateDto.Response getProfileByUserId(Long userId);

    CandidateDto.Response getProfileById(Long candidateId);

    CandidateDto.Response updateProfile(Long userId, CandidateDto.ProfileUpdateRequest request);

    CandidateDto.Response addSkill(Long userId, CandidateDto.SkillRequest request);

    void deleteSkill(Long userId, Long skillId);

    CandidateDto.Response addExperience(Long userId, CandidateDto.ExperienceRequest request);

    void deleteExperience(Long userId, Long experienceId);

    CandidateDto.Response addEducation(Long userId, CandidateDto.EducationRequest request);

    CandidateDto.Response updateEducation(Long userId, Long educationId, CandidateDto.EducationRequest request);

    void deleteEducation(Long userId, Long educationId);

    CandidateDto.Response addProject(Long userId, CandidateDto.ProjectRequest request);

    void deleteProject(Long userId, Long projectId);

    PagedResponse<CandidateDto.Response> searchCandidates(String skill, Pageable pageable);

    List<String> searchInstitutions(String query);
}
