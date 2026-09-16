package com.talentiq.repository.recommendation;

import com.talentiq.model.JobRecommendation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface JobRecommendationRepository extends JpaRepository<JobRecommendation, Long> {

    Optional<JobRecommendation> findByCandidateIdAndJobId(Long candidateId, Long jobId);

    @Query("SELECT jr FROM JobRecommendation jr JOIN FETCH jr.job j JOIN FETCH j.company WHERE jr.candidate.id = :candidateId AND jr.expiresAt > CURRENT_TIMESTAMP ORDER BY jr.overallScore DESC")
    Page<JobRecommendation> findAllByCandidateIdActive(@Param("candidateId") Long candidateId, Pageable pageable);

    @Query("SELECT jr FROM JobRecommendation jr JOIN FETCH jr.job j JOIN FETCH j.company WHERE jr.candidate.id = :candidateId AND jr.expiresAt > CURRENT_TIMESTAMP AND (:minScore IS NULL OR jr.overallScore >= :minScore) ORDER BY jr.overallScore DESC")
    Page<JobRecommendation> findAllByCandidateIdAndMinScore(
            @Param("candidateId") Long candidateId,
            @Param("minScore") BigDecimal minScore,
            Pageable pageable);

    @Query("SELECT COUNT(jr) FROM JobRecommendation jr WHERE jr.candidate.id = :candidateId AND jr.expiresAt > CURRENT_TIMESTAMP")
    long countByCandidateIdActive(@Param("candidateId") Long candidateId);

    @Query("SELECT COUNT(jr) FROM JobRecommendation jr WHERE jr.candidate.id = :candidateId AND jr.expiresAt > CURRENT_TIMESTAMP AND jr.overallScore >= :minScore")
    long countByCandidateIdAndMinScore(@Param("candidateId") Long candidateId, @Param("minScore") BigDecimal minScore);

    @Query("SELECT jr FROM JobRecommendation jr JOIN FETCH jr.candidate c JOIN FETCH c.user WHERE jr.job.id = :jobId AND jr.expiresAt > CURRENT_TIMESTAMP ORDER BY jr.overallScore DESC")
    Page<JobRecommendation> findAllByJobIdActive(@Param("jobId") Long jobId, Pageable pageable);

    void deleteAllByCandidateId(Long candidateId);
}
