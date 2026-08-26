package com.talentiq.service.job;

import com.talentiq.common.enums.JobStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.model.Company;
import com.talentiq.service.company.CompanyServiceImpl;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.dto.job.JobDto;
import com.talentiq.dto.job.JobSearchFilter;
import com.talentiq.model.Job;
import com.talentiq.model.JobSkill;
import com.talentiq.model.SavedJob;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.job.JobSkillRepository;
import com.talentiq.repository.job.SavedJobRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class JobServiceImpl implements JobService {

    private final JobRepository jobRepository;
    private final JobSkillRepository jobSkillRepository;
    private final SavedJobRepository savedJobRepository;
    private final HrProfileRepository hrProfileRepository;
    private final UserRepository userRepository;

    @Override
    public JobDto.Response createJob(Long hrUserId, JobDto.CreateRequest request) {
        HrProfile hrProfile = hrProfileRepository.findById(hrUserId)
                .or(() -> hrProfileRepository.findByUserId(hrUserId))
                .orElseThrow(() -> new ForbiddenException("Only company HR members can post jobs"));

        Company company = hrProfile.getCompany();

        String slug = StringUtils.hasText(request.getSlug())
                ? request.getSlug().toLowerCase().trim()
                : request.getTitle().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "") + "-" + System.currentTimeMillis();

        if (jobRepository.existsBySlug(slug)) {
            slug = slug + "-" + (int)(Math.random() * 10000);
        }

        Job job = Job.builder()
                .company(company)
                .postedBy(hrProfile.getUser())
                .hrProfile(hrProfile)
                .title(request.getTitle().trim())
                .slug(slug)
                .description(request.getDescription())
                .responsibilities(request.getResponsibilities())
                .requirements(request.getRequirements())
                .jobType(request.getJobType())
                .location(request.getLocation())
                .remote(Boolean.TRUE.equals(request.getRemote()))
                .hybrid(Boolean.TRUE.equals(request.getHybrid()))
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .salaryCurrency(request.getSalaryCurrency() != null ? request.getSalaryCurrency() : "USD")
                .salaryPeriod(request.getSalaryPeriod() != null ? request.getSalaryPeriod() : "YEARLY")
                .experienceLevel(request.getExperienceLevel())
                .status(request.getStatus() != null ? request.getStatus() : JobStatus.ACTIVE)
                .applicationDeadline(request.getApplicationDeadline())
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .openings(request.getOpenings() != null ? request.getOpenings() : 1)
                .build();

        if (request.getRequiredSkills() != null) {
            for (JobDto.SkillDto skillDto : request.getRequiredSkills()) {
                JobSkill skill = JobSkill.builder()
                        .job(job)
                        .skillName(skillDto.getSkillName().trim())
                        .required(skillDto.isRequired())
                        .displayOrder(skillDto.getDisplayOrder() != null ? skillDto.getDisplayOrder() : 0)
                        .build();
                job.getRequiredSkills().add(skill);
            }
        }

        Job saved = jobRepository.save(job);
        log.info("HR user {} created job {} [{}]", hrProfile.getEmail(), saved.getTitle(), saved.getSlug());
        return mapToResponse(saved);
    }

    @Override
    public JobDto.Response getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
        job.incrementViews();
        Job saved = jobRepository.save(job);
        return mapToResponse(saved);
    }

    @Override
    public JobDto.Response getJobBySlug(String slug) {
        Job job = jobRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "slug", slug));
        job.incrementViews();
        Job saved = jobRepository.save(job);
        return mapToResponse(saved);
    }

    @Override
    public JobDto.Response updateJob(Long hrUserId, Long jobId, JobDto.UpdateRequest request) {
        HrProfile hrProfile = hrProfileRepository.findById(hrUserId)
                .or(() -> hrProfileRepository.findByUserId(hrUserId))
                .orElseThrow(() -> new ForbiddenException("Only HR team members can update jobs"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Enforce company boundary
        if (!job.getCompany().getId().equals(hrProfile.getCompany().getId())) {
            throw new ForbiddenException("You do not have permissions to modify another company's job posting");
        }

        if (request.getTitle() != null) job.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) job.setDescription(request.getDescription().trim());
        if (request.getResponsibilities() != null) job.setResponsibilities(request.getResponsibilities().trim());
        if (request.getRequirements() != null) job.setRequirements(request.getRequirements().trim());
        if (request.getJobType() != null) job.setJobType(request.getJobType());
        if (request.getLocation() != null) job.setLocation(request.getLocation().trim());
        if (request.getRemote() != null) job.setRemote(request.getRemote());
        if (request.getHybrid() != null) job.setHybrid(request.getHybrid());
        if (request.getSalaryMin() != null) job.setSalaryMin(request.getSalaryMin());
        if (request.getSalaryMax() != null) job.setSalaryMax(request.getSalaryMax());
        if (request.getSalaryCurrency() != null) job.setSalaryCurrency(request.getSalaryCurrency().trim());
        if (request.getSalaryPeriod() != null) job.setSalaryPeriod(request.getSalaryPeriod().trim());
        if (request.getExperienceLevel() != null) job.setExperienceLevel(request.getExperienceLevel());
        if (request.getStatus() != null) job.setStatus(request.getStatus());
        if (request.getApplicationDeadline() != null) job.setApplicationDeadline(request.getApplicationDeadline());
        if (request.getOpenings() != null) job.setOpenings(request.getOpenings());

        if (request.getRequiredSkills() != null) {
            job.getRequiredSkills().clear();
            for (JobDto.SkillDto skillDto : request.getRequiredSkills()) {
                JobSkill skill = JobSkill.builder()
                        .job(job)
                        .skillName(skillDto.getSkillName().trim())
                        .required(skillDto.isRequired())
                        .displayOrder(skillDto.getDisplayOrder() != null ? skillDto.getDisplayOrder() : 0)
                        .build();
                job.getRequiredSkills().add(skill);
            }
        }

        Job saved = jobRepository.save(job);
        log.info("Job {} updated by HR user {}", saved.getSlug(), hrProfile.getEmail());
        return mapToResponse(saved);
    }

    @Override
    public void deleteJob(Long hrUserId, Long jobId) {
        HrProfile hrProfile = hrProfileRepository.findById(hrUserId)
                .or(() -> hrProfileRepository.findByUserId(hrUserId))
                .orElseThrow(() -> new ForbiddenException("Only HR team members can delete jobs"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getCompany().getId().equals(hrProfile.getCompany().getId())) {
            throw new ForbiddenException("You do not have permissions to delete another company's job posting");
        }

        job.setStatus(JobStatus.ARCHIVED);
        jobRepository.save(job);
        log.info("Job {} archived by HR user {}", job.getSlug(), hrProfile.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<JobDto.Response> searchJobs(JobSearchFilter filter, Pageable pageable) {
        Specification<Job> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Only search Active, non-expired jobs
            predicates.add(cb.equal(root.get("status"), JobStatus.ACTIVE));
            predicates.add(cb.or(
                    cb.isNull(root.get("expiresAt")),
                    cb.greaterThan(root.get("expiresAt"), Instant.now())
            ));

            if (filter.getQuery() != null && !filter.getQuery().isBlank()) {
                String match = "%" + filter.getQuery().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), match),
                        cb.like(cb.lower(root.get("description")), match)
                ));
            }

            if (filter.getLocation() != null && !filter.getLocation().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("location")), "%" + filter.getLocation().toLowerCase() + "%"));
            }

            if (filter.getJobTypes() != null && !filter.getJobTypes().isEmpty()) {
                predicates.add(root.get("jobType").in(filter.getJobTypes()));
            }

            if (filter.getRemote() != null) {
                predicates.add(cb.equal(root.get("remote"), filter.getRemote()));
            }

            if (filter.getHybrid() != null) {
                predicates.add(cb.equal(root.get("hybrid"), filter.getHybrid()));
            }

            if (filter.getExperienceLevels() != null && !filter.getExperienceLevels().isEmpty()) {
                predicates.add(root.get("experienceLevel").in(filter.getExperienceLevels()));
            }

            if (filter.getMinSalary() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("salaryMax"), filter.getMinSalary()));
            }

            if (filter.getSkills() != null && !filter.getSkills().isEmpty()) {
                Join<Job, JobSkill> skillJoin = root.join("requiredSkills");
                predicates.add(cb.lower(skillJoin.get("skillName")).in(
                        filter.getSkills().stream().map(String::toLowerCase).toList()
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Job> jobs = jobRepository.findAll(spec, pageable);
        return PagedResponse.of(jobs.map(this::mapToResponse));
    }

    @Override
    public void saveJob(Long userId, Long jobId) {
        if (savedJobRepository.existsByUserIdAndJobId(userId, jobId)) {
            return;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        SavedJob savedJob = SavedJob.builder()
                .user(user)
                .job(job)
                .build();

        savedJobRepository.save(savedJob);
    }

    @Override
    public void unsaveJob(Long userId, Long jobId) {
        savedJobRepository.deleteByUserIdAndJobId(userId, jobId);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<JobDto.Response> listSavedJobs(Long userId, Pageable pageable) {
        Page<SavedJob> savedJobs = savedJobRepository.findAllByUserId(userId, pageable);
        return PagedResponse.of(savedJobs.map(sj -> mapToResponse(sj.getJob())));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<JobDto.Response> listJobsByCompany(Long companyId, Pageable pageable) {
        Page<Job> jobs = jobRepository.findAllByCompanyId(companyId, pageable);
        return PagedResponse.of(jobs.map(this::mapToResponse));
    }

    private JobDto.Response mapToResponse(Job job) {
        List<JobDto.SkillDto> skillDtos = job.getRequiredSkills().stream()
                .map(s -> JobDto.SkillDto.builder()
                        .skillName(s.getSkillName())
                        .required(s.isRequired())
                        .displayOrder(s.getDisplayOrder())
                        .build())
                .toList();

        return JobDto.Response.builder()
                .id(job.getId())
                .company(CompanyServiceImpl.mapToResponse(job.getCompany()))
                .postedById(job.getPostedBy() != null ? job.getPostedBy().getId() : null)
                .title(job.getTitle())
                .slug(job.getSlug())
                .description(job.getDescription())
                .responsibilities(job.getResponsibilities())
                .requirements(job.getRequirements())
                .jobType(job.getJobType())
                .location(job.getLocation())
                .remote(job.isRemote())
                .hybrid(job.isHybrid())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .salaryCurrency(job.getSalaryCurrency())
                .salaryPeriod(job.getSalaryPeriod())
                .experienceLevel(job.getExperienceLevel())
                .status(job.getStatus())
                .applicationDeadline(job.getApplicationDeadline())
                .expiresAt(job.getExpiresAt())
                .openings(job.getOpenings())
                .viewsCount(job.getViewsCount())
                .applicationsCount(job.getApplicationsCount())
                .requiredSkills(skillDtos)
                .createdAt(job.getCreatedAt())
                .build();
    }
}
