package com.talentiq.repository.resume;

import com.talentiq.model.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {

    List<Resume> findAllByCandidateId(Long candidateId);

    Optional<Resume> findByCandidateIdAndActiveTrue(Long candidateId);

    @Modifying
    @Query("UPDATE Resume r SET r.active = false WHERE r.candidate.id = :candidateId AND r.id <> :activeResumeId")
    void deactivateOtherResumes(@Param("candidateId") Long candidateId, @Param("activeResumeId") Long activeResumeId);
}
