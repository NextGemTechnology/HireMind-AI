package com.talentiq.repository.job;

import com.talentiq.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JobRepository extends JpaRepository<Job, Long>, JpaSpecificationExecutor<Job> {

    Optional<Job> findBySlug(String slug);

    boolean existsBySlug(String slug);

    long countByStatus(com.talentiq.common.enums.JobStatus status);

    @EntityGraph(attributePaths = {"company", "requiredSkills"})
    Page<Job> findAllByCompanyId(Long companyId, Pageable pageable);

    @Query("SELECT j FROM Job j JOIN FETCH j.company WHERE j.status = 'ACTIVE' AND (j.expiresAt IS NULL OR j.expiresAt > CURRENT_TIMESTAMP)")
    Page<Job> findActiveJobs(Pageable pageable);

    @Query("SELECT j FROM Job j JOIN FETCH j.company WHERE j.status = 'ACTIVE' AND (j.expiresAt IS NULL OR j.expiresAt > CURRENT_TIMESTAMP) ORDER BY j.createdAt DESC")
    Page<Job> findRecentActiveJobs(Pageable pageable);

    @Query("SELECT DISTINCT j FROM Job j JOIN FETCH j.company LEFT JOIN j.requiredSkills js WHERE j.status = 'ACTIVE' AND (j.expiresAt IS NULL OR j.expiresAt > CURRENT_TIMESTAMP) AND (LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(js.skillName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.location) LIKE LOWER(CONCAT('%', :keyword, '%'))) ORDER BY j.createdAt DESC")
    Page<Job> searchActiveJobsByKeyword(@org.springframework.data.repository.query.Param("keyword") String keyword, Pageable pageable);
}
