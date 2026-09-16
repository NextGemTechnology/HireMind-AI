package com.talentiq.repository.hr;

import com.talentiq.model.HrProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HrProfileRepository extends JpaRepository<HrProfile, Long> {

    Optional<HrProfile> findByUserId(Long userId);

    Optional<HrProfile> findByEmail(String email);

    List<HrProfile> findAllByCompanyId(Long companyId);

    long countByCompanyId(Long companyId);

    long countByCompanyIdAndCompanyVerifiedTrue(Long companyId);

    boolean existsByUserId(Long userId);

    boolean existsByEmail(String email);
}
