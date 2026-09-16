package com.talentiq.repository.candidate;

import com.talentiq.model.CandidateSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateSkillRepository extends JpaRepository<CandidateSkill, Long> {
    List<CandidateSkill> findByCandidateIdOrderByDisplayOrderAsc(Long candidateId);
    Optional<CandidateSkill> findByCandidateIdAndSkillNameIgnoreCase(Long candidateId, String skillName);
    void deleteByCandidateIdAndId(Long candidateId, Long skillId);
}
