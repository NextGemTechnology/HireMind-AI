package com.talentiq.service.admin;

import com.talentiq.common.enums.JobStatus;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.dto.admin.AdminDto;
import com.talentiq.repository.application.JobApplicationRepository;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.dto.company.CompanyDto;
import com.talentiq.model.Company;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.service.company.CompanyServiceImpl;
import com.talentiq.repository.job.JobRepository;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.dto.user.UserDto;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final CandidateRepository candidateRepository;
    private final HrProfileRepository hrProfileRepository;
    private final ResumeRepository resumeRepository;
    private final MailService mailService;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<UserDto.Response> listUsers(String search, Boolean enabled, Pageable pageable) {
        Page<User> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCase(search.trim(), pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return PagedResponse.of(users.map(this::mapUserToResponse));
    }

    @Override
    public UserDto.Response setUserEnabledStatus(Long adminUserId, Long targetUserId, AdminDto.UserStatusRequest request) {
        if (adminUserId.equals(targetUserId)) {
            throw new BadRequestException("You cannot disable your own admin account");
        }

        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        if (Boolean.TRUE.equals(request.getEnabled())) {
            user.setStatus(UserStatus.ACTIVE);
        } else {
            user.setStatus(UserStatus.SUSPENDED);
        }

        User saved = userRepository.save(user);

        String action = user.getStatus() == UserStatus.ACTIVE ? "unlocked/enabled" : "locked/suspended";
        log.info("Admin ID {} {} user account ID {}", adminUserId, action, targetUserId);

        // Notify user via email if suspended
        if (user.getStatus() == UserStatus.SUSPENDED) {
            mailService.sendSystemAlert(
                    user.getEmail(),
                    "Account Status Notice",
                    "Your TalentIQ account has been administrative suspended. Reason: " + (request.getReason() != null ? request.getReason() : "Policy compliance review")
            );
        }

        return mapUserToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CompanyDto.Response> listPendingCompanies(Pageable pageable) {
        Page<Company> pending = companyRepository.findAllByVerifiedFalse(pageable);
        return PagedResponse.of(pending.map(CompanyServiceImpl::mapToResponse));
    }

    @Override
    public CompanyDto.Response verifyCompany(Long adminUserId, Long companyId, AdminDto.CompanyVerificationRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        company.setVerified(Boolean.TRUE.equals(request.getApproved()));
        Company saved = companyRepository.save(company);

        log.info("Admin ID {} set verification status to {} for Company ID {}", adminUserId, company.isVerified(), companyId);
        return CompanyServiceImpl.mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDto.SystemMetricsResponse getSystemMetrics(Long adminUserId) {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.findAll().stream().filter(u -> u.getStatus() == UserStatus.ACTIVE).count();
        long lockedUsers = totalUsers - activeUsers;

        List<Company> companies = companyRepository.findAll();
        long totalCompanies = companies.size();
        long verifiedCompanies = companies.stream().filter(Company::isVerified).count();
        long pendingCompanies = totalCompanies - verifiedCompanies;

        long totalJobs = jobRepository.count();
        long activeJobs = jobRepository.findAll().stream().filter(j -> j.getStatus().equals(JobStatus.ACTIVE)).count();

        long totalApplications = applicationRepository.count();
        long totalResumes = resumeRepository.count();

        return AdminDto.SystemMetricsResponse.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .lockedUsers(lockedUsers)
                .totalCompanies(totalCompanies)
                .verifiedCompanies(verifiedCompanies)
                .pendingCompanies(pendingCompanies)
                .totalJobs(totalJobs)
                .activeJobs(activeJobs)
                .totalApplications(totalApplications)
                .totalResumes(totalResumes)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDto.TemporalJobMetricsResponse getTemporalJobMetrics(Long adminUserId) {
        ZoneId zone = ZoneId.systemDefault();
        LocalDate now = LocalDate.now();

        Instant startOfToday = now.atStartOfDay(zone).toInstant();
        Instant startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay(zone).toInstant();
        Instant startOfMonth = now.withDayOfMonth(1).atStartOfDay(zone).toInstant();
        Instant startOfYear = now.withDayOfYear(1).atStartOfDay(zone).toInstant();

        long jobsToday = jobRepository.countByCreatedAtAfter(startOfToday);
        long jobsThisWeek = jobRepository.countByCreatedAtAfter(startOfWeek);
        long jobsThisMonth = jobRepository.countByCreatedAtAfter(startOfMonth);
        long jobsThisYear = jobRepository.countByCreatedAtAfter(startOfYear);
        long totalJobs = jobRepository.count();
        long activeJobs = jobRepository.countByStatus(JobStatus.ACTIVE);

        return AdminDto.TemporalJobMetricsResponse.builder()
                .jobsToday(jobsToday)
                .jobsThisWeek(jobsThisWeek)
                .jobsThisMonth(jobsThisMonth)
                .jobsThisYear(jobsThisYear)
                .totalJobs(totalJobs)
                .activeJobs(activeJobs)
                .build();
    }

    @Override
    public UserDto.Response setCandidateBlockStatus(Long adminUserId, Long candidateId, AdminDto.ModerationRequest request) {
        User user = userRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate User", "id", candidateId));

        if (Boolean.TRUE.equals(request.getBlocked())) {
            user.setStatus(UserStatus.BLOCKED);
        } else {
            user.setStatus(UserStatus.ACTIVE);
        }

        User saved = userRepository.save(user);
        log.info("Management Admin ID {} set candidate ID {} status to {}", adminUserId, candidateId, saved.getStatus());
        return mapUserToResponse(saved);
    }

    @Override
    public UserDto.Response setHrBlockStatus(Long adminUserId, Long hrProfileId, AdminDto.ModerationRequest request) {
        HrProfile hrProfile = hrProfileRepository.findById(hrProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("HR Profile", "id", hrProfileId));

        User user = hrProfile.getUser();
        if (Boolean.TRUE.equals(request.getBlocked())) {
            user.setStatus(UserStatus.BLOCKED);
            hrProfile.setActive(false);
        } else {
            user.setStatus(UserStatus.ACTIVE);
            hrProfile.setActive(true);
        }

        hrProfileRepository.save(hrProfile);
        User saved = userRepository.save(user);
        log.info("Management Admin ID {} set HR User ID {} status to {}", adminUserId, user.getId(), saved.getStatus());
        return mapUserToResponse(saved);
    }

    @Override
    public CompanyDto.Response setCompanyBlacklistStatus(Long adminUserId, Long companyId, AdminDto.ModerationRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        boolean blocked = Boolean.TRUE.equals(request.getBlocked());
        company.setBlacklisted(blocked);
        company.setActive(!blocked);

        Company saved = companyRepository.save(company);
        log.info("Management Admin ID {} set Company ID {} blacklisted={}", adminUserId, companyId, blocked);
        return CompanyServiceImpl.mapToResponse(saved);
    }

    private UserDto.Response mapUserToResponse(User user) {
        return UserDto.Response.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getStatus())
                .roles(user.getRoles())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
