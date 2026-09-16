package com.talentiq.repository.candidate;

import com.talentiq.model.CandidateEducation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateEducationRepository extends JpaRepository<CandidateEducation, Long> {
    List<CandidateEducation> findByCandidateIdOrderByStartDateDesc(Long candidateId);

    @Query("SELECT DISTINCT e.institution FROM CandidateEducation e WHERE LOWER(e.institution) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY e.institution ASC")
    List<String> searchInstitutions(@Param("query") String query, Pageable pageable);
}
