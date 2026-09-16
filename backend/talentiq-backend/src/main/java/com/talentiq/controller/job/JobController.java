package com.talentiq.controller.job;

import com.talentiq.common.enums.ExperienceLevel;
import com.talentiq.common.enums.JobType;
import com.talentiq.common.response.ApiResponse;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.job.JobDto;
import com.talentiq.dto.job.JobSearchFilter;
import com.talentiq.service.job.JobService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/jobs")
@RequiredArgsConstructor
@Tag(name = "Job Posting", description = "Job postings management, searches, and candidate bookmarking")
public class JobController {

    private final JobService jobService;

    @PostMapping
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Create a new job posting (HR only)")
    public ResponseEntity<ApiResponse<JobDto.Response>> createJob(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody JobDto.CreateRequest request) {
        JobDto.Response response = jobService.createJob(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Job posting created", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job details by ID")
    public ResponseEntity<ApiResponse<JobDto.Response>> getJobById(@PathVariable Long id) {
        JobDto.Response response = jobService.getJobById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/s/{slug}")
    @Operation(summary = "Get job details by slug")
    public ResponseEntity<ApiResponse<JobDto.Response>> getJobBySlug(@PathVariable String slug) {
        JobDto.Response response = jobService.getJobBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Update an existing job posting")
    public ResponseEntity<ApiResponse<JobDto.Response>> updateJob(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody JobDto.UpdateRequest request) {
        JobDto.Response response = jobService.updateJob(principal.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Job posting updated", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Delete (archive) a job posting")
    public ResponseEntity<ApiResponse<Void>> deleteJob(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        jobService.deleteJob(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Job posting archived"));
    }

    @GetMapping
    @Operation(summary = "Search jobs with multi-criteria filtering")
    public ResponseEntity<PagedResponse<JobDto.Response>> searchJobs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) List<JobType> jobTypes,
            @RequestParam(required = false) Boolean remote,
            @RequestParam(required = false) Boolean hybrid,
            @RequestParam(required = false) List<ExperienceLevel> experienceLevels,
            @RequestParam(required = false) BigDecimal minSalary,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) List<String> skills,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        JobSearchFilter filter = new JobSearchFilter();
        filter.setQuery(query);
        filter.setLocation(location);
        filter.setJobTypes(jobTypes);
        filter.setRemote(remote);
        filter.setHybrid(hybrid);
        filter.setExperienceLevels(experienceLevels);
        filter.setMinSalary(minSalary);
        filter.setCurrency(currency);
        filter.setSkills(skills);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(jobService.searchJobs(filter, pageable));
    }

    @GetMapping("/company/{companyId}")
    @Operation(summary = "List all jobs posted by a company")
    public ResponseEntity<PagedResponse<JobDto.Response>> listCompanyJobs(
            @PathVariable Long companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(jobService.listJobsByCompany(companyId, pageable));
    }

    // ── Candidate Bookmarks (Saved Jobs) ──────────────────────────────────────
    @PostMapping("/{id}/save")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Save a job to bookmarks")
    public ResponseEntity<ApiResponse<Void>> saveJob(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        jobService.saveJob(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Job saved to bookmarks"));
    }

    @DeleteMapping("/{id}/unsave")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "Remove a job from bookmarks")
    public ResponseEntity<ApiResponse<Void>> unsaveJob(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        jobService.unsaveJob(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Job removed from bookmarks"));
    }

    @GetMapping("/saved")
    @PreAuthorize("hasRole('CANDIDATE')")
    @Operation(summary = "List own saved jobs")
    public ResponseEntity<PagedResponse<JobDto.Response>> listMySavedJobs(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(jobService.listSavedJobs(principal.getId(), pageable));
    }
}
