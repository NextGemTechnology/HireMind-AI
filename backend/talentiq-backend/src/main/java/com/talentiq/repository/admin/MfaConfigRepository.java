package com.talentiq.repository.admin;

import com.talentiq.model.MfaConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MfaConfigRepository extends JpaRepository<MfaConfig, Long> {

    Optional<MfaConfig> findByUserId(Long userId);

    boolean existsByUserIdAndEnabledTrue(Long userId);

    void deleteByUserId(Long userId);
}
