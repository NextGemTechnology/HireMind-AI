package com.talentiq.repository.ai;

import com.talentiq.model.AiUserPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiUserPreferencesRepository extends JpaRepository<AiUserPreferences, Long> {

    Optional<AiUserPreferences> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
