package com.talentiq.service.application;

import com.talentiq.common.enums.ApplicationStatus;
import com.talentiq.common.enums.JobStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.application.JobApplicationDto;
import com.talentiq.model.ApplicationStatusHistory;
import com.talentiq.model.JobApplication;
import com.talentiq.repository.application.ApplicationStatusHistoryRepository;
import com.talentiq.repository.application.JobApplicationRepository;
import com.talentiq.dto.candidate.CandidateDto;
import com.talentiq.model.Candidate;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.service.company.CompanyServiceImpl;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.dto.job.JobDto;
import com.talentiq.model.Job;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.model.JobRecommendation;
import com.talentiq.repository.recommendation.JobRecommendationRepository;
import com.talentiq.service.recommendation.RecommendationService;
import com.talentiq.dto.resume.ResumeDto;
import com.talentiq.model.Resume;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.model.Notification;
import com.talentiq.repository.notification.NotificationRepository;
import com.talentiq.service.notification.NotificationService;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class JobApplicationServiceImpl implements JobApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final CandidateRepository candidateRepository;
    private final JobRepository jobRepository;
    private final ResumeRepository resumeRepository;
    private final HrProfileRepository hrProfileRepository;
    private final UserRepository userRepository;
    private final JobRecommendationRepository recommendationRepository;
    private final RecommendationService recommendationService;
    private final NotificationService notificationService;

    @Override
    public JobApplicationDto.Response applyForJob(Long userId, JobApplicationDto.ApplyRequest request) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", request.getJobId()));

        if (!job.getStatus().equals(JobStatus.ACTIVE)) {
            throw new BadRequestException("This job posting is not accepting applications");
        }

        if (applicationRepository.existsByJobIdAndCandidateId(job.getId(), candidate.getId())) {
            throw new BadRequestException("You have already applied for this job");
        }

        // Resolve resume: either explicit or candidate's active version
        Resume resume = null;
        if (request.getResumeId() != null) {
            resume = resumeRepository.findById(request.getResumeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", request.getResumeId()));
            if (!resume.getCandidate().getId().equals(candidate.getId())) {
                throw new ForbiddenException("You do not own this resume version");
            }
        } else {
            resume = resumeRepository.findByCandidateIdAndActiveTrue(candidate.getId())
                    .orElseThrow(() -> new BadRequestException("Please upload and set an active resume before applying"));
        }

        // Pull AI match score from recommendations cache if exists, otherwise compute it now
        JobRecommendation rec = recommendationRepository.findByCandidateIdAndJobId(candidate.getId(), job.getId())
                .orElseGet(() -> {
                    recommendationService.computeRecommendationMatch(candidate.getId(), job.getId());
                    return recommendationRepository.findByCandidateIdAndJobId(candidate.getId(), job.getId()).orElse(null);
                });

        BigDecimal matchScore = rec != null ? rec.getOverallScore() : BigDecimal.ZERO;
        String matchDetails = rec != null ? rec.getScoreDetails() : null;

        JobApplication application = JobApplication.builder()
                .job(job)
                .candidate(candidate)
                .resume(resume)
                .coverLetter(request.getCoverLetter())
                .aiMatchScore(matchScore)
                .aiMatchDetails(matchDetails)
                .status(ApplicationStatus.APPLIED)
                .appliedAt(Instant.now())
                .build();

        JobApplication saved = applicationRepository.save(application);

        // Record initial history transition
        ApplicationStatusHistory history = ApplicationStatusHistory.builder()
                .application(saved)
                .fromStatus(null)
                .toStatus(ApplicationStatus.APPLIED)
                .notes("Application submitted successfully")
                .build();
        historyRepository.save(history);

        // Update Job counters
        job.incrementApplications();
        jobRepository.save(job);

        // Notify HR recruiter who posted the job
        if (job.getPostedBy() != null) {
            String candidateName = candidate.getUser() != null ? (candidate.getUser().getFirstName() + " " + candidate.getUser().getLastName()) : "A candidate";
            
            com.talentiq.dto.notification.NotificationDto.SendRequest req = new com.talentiq.dto.notification.NotificationDto.SendRequest();
            req.setTitle("New Applicant: " + candidateName);
            req.setMessage(candidateName + " applied for " + job.getTitle() + " (AI Match Score: " + matchScore.intValue() + "%)");
            req.setType("APPLICATION_STATUS");
            req.setLinkUrl("/hr-applications");
            
            notificationService.sendNotification(job.getPostedBy().getId(), req);
        }

        log.info("Candidate ID {} applied for Job ID {}", candidate.getId(), job.getId());
        return mapToResponse(saved);
    }

    @Override
    public JobApplicationDto.Response updateApplicationStatus(Long hrUserId, Long applicationId, JobApplicationDto.StatusUpdateRequest request) {
        HrProfile hrProfile = hrProfileRepository.findByUserId(hrUserId)
                .orElseThrow(() -> new ForbiddenException("Only HR team members can update application status"));

        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("JobApplication", "id", applicationId));

        // Enforce company boundary
        if (!application.getJob().getCompany().getId().equals(hrProfile.getCompany().getId())) {
            throw new ForbiddenException("You cannot modify job applications from another company");
        }

        ApplicationStatus originalStatus = application.getStatus();
        ApplicationStatus newStatus = request.getStatus();

        if (originalStatus == newStatus) {
            return mapToResponse(application);
        }

        // Apply state overrides
        application.setStatus(newStatus);
        if (request.getRecruiterNotes() != null) application.setRecruiterNotes(request.getRecruiterNotes());
        if (request.getInterviewDate() != null) application.setInterviewDate(request.getInterviewDate());
        if (request.getOfferDate() != null) application.setOfferDate(request.getOfferDate());
        if (request.getOfferAmount() != null) application.setOfferAmount(request.getOfferAmount());
        if (request.getOfferCurrency() != null) application.setOfferCurrency(request.getOfferCurrency());
        if (request.getRejectionReason() != null) application.setRejectionReason(request.getRejectionReason());

        JobApplication saved = applicationRepository.save(application);

        // Log history audit transition
        ApplicationStatusHistory history = ApplicationStatusHistory.builder()
                .application(saved)
                .fromStatus(originalStatus)
                .toStatus(newStatus)
                .changedBy(hrProfile.getUser())
                .notes(request.getNotes() != null ? request.getNotes().trim() : "Recruiter updated application stage")
                .build();
        historyRepository.save(history);

        // Notify Candidate of status change
        if (application.getCandidate() != null && application.getCandidate().getUser() != null) {
            com.talentiq.dto.notification.NotificationDto.SendRequest req = new com.talentiq.dto.notification.NotificationDto.SendRequest();
            req.setTitle("Application Status Update");
            req.setMessage("Your application for " + application.getJob().getTitle() + " has been updated to: " + newStatus);
            req.setType("APPLICATION_STATUS");
            req.setLinkUrl("/my-applications");
            
            notificationService.sendNotification(application.getCandidate().getUser().getId(), req);
        }

        log.info("Application ID {} status updated from {} to {} by HR ID {}", applicationId, originalStatus, newStatus, hrProfile.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<JobApplicationDto.Response> getApplicationsForHrCompany(Long hrUserId, ApplicationStatus status, Pageable pageable) {
        HrProfile hrProfile = hrProfileRepository.findByUserId(hrUserId)
                .orElseThrow(() -> new ForbiddenException("Only company HR members can view job applications"));

        Page<JobApplication> applications;
        if (status != null) {
            applications = applicationRepository.findAllByJobCompanyIdAndStatus(hrProfile.getCompany().getId(), status, pageable);
        } else {
            applications = applicationRepository.findAllByJobCompanyId(hrProfile.getCompany().getId(), pageable);
        }
        return PagedResponse.of(applications.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<JobApplicationDto.Response> getApplicationsForJob(Long hrUserId, Long jobId, ApplicationStatus status, Pageable pageable) {
        HrProfile hrProfile = hrProfileRepository.findByUserId(hrUserId)
                .orElseThrow(() -> new ForbiddenException("Only company HR members can view job applications"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getCompany().getId().equals(hrProfile.getCompany().getId())) {
            throw new ForbiddenException("You do not have permissions to view applications for this job posting");
        }

        Page<JobApplication> applications;
        if (status != null) {
            applications = applicationRepository.findAllByJobIdAndStatus(jobId, status, pageable);
        } else {
            applications = applicationRepository.findAllByJobId(jobId, pageable);
        }
        return PagedResponse.of(applications.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<JobApplicationDto.Response> getCandidateApplications(Long userId, Pageable pageable) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        Page<JobApplication> applications = applicationRepository.findAllByCandidateId(candidate.getId(), pageable);
        return PagedResponse.of(applications.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public JobApplicationDto.Response getApplicationDetails(Long userId, Long applicationId) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("JobApplication", "id", applicationId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Permission verification: Candidate (applicant) or company HR or Admin
        boolean isOwner = application.getCandidate().getUser().getId().equals(userId);
        boolean isCompanyHr = false;

        if (user.getRoles().contains(com.talentiq.common.enums.Role.ROLE_HR)) {
            HrProfile hrProfile = hrProfileRepository.findByUserId(userId).orElse(null);
            if (hrProfile != null && hrProfile.getCompany().getId().equals(application.getJob().getCompany().getId())) {
                isCompanyHr = true;
            }
        }

        boolean isAdmin = user.getRoles().contains(com.talentiq.common.enums.Role.ROLE_SUPER_ADMIN)
                || user.getRoles().contains(com.talentiq.common.enums.Role.ROLE_PLATFORM_ADMIN);

        if (!isOwner && !isCompanyHr && !isAdmin) {
            throw new ForbiddenException("You do not have permission to view this job application");
        }

        List<ApplicationStatusHistory> history = historyRepository.findByApplicationIdOrderByCreatedAtAsc(applicationId);
        JobApplicationDto.Response response = mapToResponse(application);
        response.setStatusHistory(history.stream().map(h ->
                JobApplicationDto.StatusHistoryResponse.builder()
                        .id(h.getId())
                        .fromStatus(h.getFromStatus())
                        .toStatus(h.getToStatus())
                        .notes(h.getNotes())
                        .createdAt(h.getCreatedAt())
                        .changedByEmail(h.getChangedBy() != null ? h.getChangedBy().getEmail() : "SYSTEM")
                        .build()
        ).toList());

        return response;
    }

    // ── Mapper helper ─────────────────────────────────────────────────────────

    private JobApplicationDto.Response mapToResponse(JobApplication app) {
        Job job = app.getJob();
        Candidate candidate = app.getCandidate();
        Resume resume = app.getResume();

        return JobApplicationDto.Response.builder()
                .id(app.getId())
                .job(mapJobToResponse(job))
                .candidate(mapCandidateToResponse(candidate))
                .resume(mapResumeToDto(resume))
                .status(app.getStatus())
                .coverLetter(app.getCoverLetter())
                .aiMatchScore(app.getAiMatchScore())
                .recruiterNotes(app.getRecruiterNotes())
                .interviewDate(app.getInterviewDate())
                .offerDate(app.getOfferDate())
                .offerAmount(app.getOfferAmount())
                .offerCurrency(app.getOfferCurrency())
                .rejectionReason(app.getRejectionReason())
                .appliedAt(app.getAppliedAt())
                .build();
    }

    private JobDto.Response mapJobToResponse(Job job) {
        return JobDto.Response.builder()
                .id(job.getId())
                .company(CompanyServiceImpl.mapToResponse(job.getCompany()))
                .title(job.getTitle())
                .slug(job.getSlug())
                .location(job.getLocation())
                .jobType(job.getJobType())
                .remote(job.isRemote())
                .hybrid(job.isHybrid())
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

    private ResumeDto mapResumeToDto(Resume resume) {
        if (resume == null) return null;
        return ResumeDto.builder()
                .id(resume.getId())
                .versionName(resume.getVersionName())
                .originalName(resume.getOriginalName())
                .fileUrl(resume.getFileUrl())
                .build();
    }
}
