package com.talentiq.ai.repository;
import com.talentiq.ai.model.*;

import com.talentiq.ai.model.AiCopilotConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiCopilotConfigRepository extends JpaRepository<AiCopilotConfig, Long> {
    Optional<AiCopilotConfig> findByHrId(Long hrId);
}
