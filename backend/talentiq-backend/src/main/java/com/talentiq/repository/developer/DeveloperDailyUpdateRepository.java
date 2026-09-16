package com.talentiq.repository.developer;

import com.talentiq.model.DeveloperDailyUpdate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeveloperDailyUpdateRepository extends JpaRepository<DeveloperDailyUpdate, Long> {

    @Query("SELECT d FROM DeveloperDailyUpdate d WHERE d.user.id = :userId ORDER BY d.submittedAt DESC")
    List<DeveloperDailyUpdate> findByUserIdOrderBySubmittedAtDesc(@Param("userId") Long userId);

    @Query("SELECT d FROM DeveloperDailyUpdate d WHERE d.user.id = :userId ORDER BY d.submittedAt DESC")
    List<DeveloperDailyUpdate> findRecentByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT d FROM DeveloperDailyUpdate d WHERE d.user.id = :userId AND d.submittedAt >= :since ORDER BY d.submittedAt DESC")
    List<DeveloperDailyUpdate> findTodayUpdates(@Param("userId") Long userId, @Param("since") Instant since);
}
