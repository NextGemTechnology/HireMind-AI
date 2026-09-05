package com.talentiq.repository.copilot;

import com.talentiq.model.AiConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiConversationRepository extends JpaRepository<AiConversation, Long> {

    List<AiConversation> findAllByHrIdAndArchivedFalseOrderByUpdatedAtDesc(Long hrId);

    Optional<AiConversation> findByIdAndHrId(Long id, Long hrId);

    List<AiConversation> findAllByCandidateIdAndArchivedFalseOrderByUpdatedAtDesc(Long candidateId);

    Optional<AiConversation> findByIdAndCandidateId(Long id, Long candidateId);

    List<AiConversation> findAllByCompanyIdAndArchivedFalseOrderByUpdatedAtDesc(Long companyId);
}
