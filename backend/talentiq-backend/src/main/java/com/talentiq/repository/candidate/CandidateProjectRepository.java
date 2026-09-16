package com.talentiq.repository.candidate;

import com.talentiq.model.CandidateProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateProjectRepository extends JpaRepository<CandidateProject, Long> {
    List<CandidateProject> findByCandidateIdOrderByDisplayOrderAsc(Long candidateId);
}
