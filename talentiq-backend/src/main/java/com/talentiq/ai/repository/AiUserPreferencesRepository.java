package com.talentiq.ai.repository;
import com.talentiq.ai.model.*;

import com.talentiq.ai.model.AiUserPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiUserPreferencesRepository extends JpaRepository<AiUserPreferences, Long> {

    Optional<AiUserPreferences> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
