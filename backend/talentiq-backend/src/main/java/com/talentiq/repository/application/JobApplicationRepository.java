package com.talentiq.repository.application;

import com.talentiq.model.JobApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.talentiq.common.enums.ApplicationStatus;

import java.util.Optional;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    Optional<JobApplication> findByJobIdAndCandidateId(Long jobId, Long candidateId);

    boolean existsByJobIdAndCandidateId(Long jobId, Long candidateId);

    long countByStatus(ApplicationStatus status);

    long countByCandidateId(Long candidateId);

    @EntityGraph(attributePaths = {"job", "job.company", "candidate", "candidate.user"})
    Page<JobApplication> findAllByJobId(Long jobId, Pageable pageable);

    @EntityGraph(attributePaths = {"job", "job.company", "candidate", "candidate.user"})
    Page<JobApplication> findAllByCandidateId(Long candidateId, Pageable pageable);

    @EntityGraph(attributePaths = {"job", "job.company", "candidate", "candidate.user"})
    Page<JobApplication> findAllByJobCompanyId(Long companyId, Pageable pageable);

    // New methods for status filtering
    @EntityGraph(attributePaths = {"job", "job.company", "candidate", "candidate.user"})
    Page<JobApplication> findAllByJobIdAndStatus(Long jobId, ApplicationStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"job", "job.company", "candidate", "candidate.user"})
    Page<JobApplication> findAllByJobCompanyIdAndStatus(Long companyId, ApplicationStatus status, Pageable pageable);
}
