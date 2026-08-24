package com.talentiq.controller.candidate;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.candidate.CandidateDto;
import com.talentiq.service.candidate.CandidateService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/candidates")
@RequiredArgsConstructor
@Tag(name = "Candidate", description = "Candidate profile management, skills, experience, education, projects")
public class CandidateController {

    private final CandidateService candidateService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own candidate profile")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> getMyProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        CandidateDto.Response profile = candidateService.getProfileByUserId(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update candidate profile")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CandidateDto.ProfileUpdateRequest request) {
        CandidateDto.Response updated = candidateService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }

    // ── Skills ────────────────────────────────────────────────────────────────
    @PostMapping("/me/skills")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add a skill to candidate profile")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> addSkill(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CandidateDto.SkillRequest request) {
        CandidateDto.Response updated = candidateService.addSkill(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Skill added", updated));
    }

    @DeleteMapping("/me/skills/{skillId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a skill")
    public ResponseEntity<ApiResponse<Void>> deleteSkill(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long skillId) {
        candidateService.deleteSkill(principal.getId(), skillId);
        return ResponseEntity.ok(ApiResponse.success("Skill deleted"));
    }

    // ── Experiences ───────────────────────────────────────────────────────────
    @PostMapping("/me/experiences")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add experience entry")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> addExperience(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CandidateDto.ExperienceRequest request) {
        CandidateDto.Response updated = candidateService.addExperience(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Experience added", updated));
    }

    @DeleteMapping("/me/experiences/{experienceId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete an experience entry")
    public ResponseEntity<ApiResponse<Void>> deleteExperience(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long experienceId) {
        candidateService.deleteExperience(principal.getId(), experienceId);
        return ResponseEntity.ok(ApiResponse.success("Experience deleted"));
    }

    // ── Educations / Qualifications ───────────────────────────────────────────
    @PostMapping("/me/educations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add education/qualification entry")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> addEducation(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CandidateDto.EducationRequest request) {
        CandidateDto.Response updated = candidateService.addEducation(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Education added successfully", updated));
    }

    @PutMapping("/me/educations/{educationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update an existing education/qualification entry")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> updateEducation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long educationId,
            @Valid @RequestBody CandidateDto.EducationRequest request) {
        CandidateDto.Response updated = candidateService.updateEducation(principal.getId(), educationId, request);
        return ResponseEntity.ok(ApiResponse.success("Education updated successfully", updated));
    }

    @DeleteMapping("/me/educations/{educationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete an education entry")
    public ResponseEntity<ApiResponse<Void>> deleteEducation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long educationId) {
        candidateService.deleteEducation(principal.getId(), educationId);
        return ResponseEntity.ok(ApiResponse.success("Education deleted"));
    }

    @GetMapping("/institutions/search")
    @Operation(summary = "Search colleges, universities, and schools with debouncing")
    public ResponseEntity<ApiResponse<List<String>>> searchInstitutions(
            @RequestParam(required = false, defaultValue = "") String q) {
        List<String> institutions = candidateService.searchInstitutions(q);
        return ResponseEntity.ok(ApiResponse.success(institutions));
    }

    // ── Projects ──────────────────────────────────────────────────────────────
    @PostMapping("/me/projects")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add project entry")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> addProject(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CandidateDto.ProjectRequest request) {
        CandidateDto.Response updated = candidateService.addProject(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Project added", updated));
    }

    @DeleteMapping("/me/projects/{projectId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a project entry")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long projectId) {
        candidateService.deleteProject(principal.getId(), projectId);
        return ResponseEntity.ok(ApiResponse.success("Project deleted"));
    }

    // ── Search & View (HR/Admin) ──────────────────────────────────────────────
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Search open-to-work candidates by skill")
    public ResponseEntity<PagedResponse<CandidateDto.Response>> searchCandidates(
            @RequestParam(required = false) String skill,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(candidateService.searchCandidates(skill, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get candidate profile by ID")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> getCandidateById(
            @PathVariable Long id) {
        CandidateDto.Response profile = candidateService.getProfileById(id);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get candidate profile by User ID")
    public ResponseEntity<ApiResponse<CandidateDto.Response>> getCandidateByUserId(
            @PathVariable Long userId) {
        CandidateDto.Response profile = candidateService.getProfileByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}
