package com.talentiq.repository.subscription;

import com.talentiq.common.enums.SubscriptionStatus;
import com.talentiq.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    @Query("SELECT s FROM Subscription s JOIN FETCH s.plan WHERE s.user.id = :userId AND s.status = :status")
    Optional<Subscription> findByUserIdAndStatusWithPlan(@Param("userId") Long userId, @Param("status") SubscriptionStatus status);

    @Query("SELECT s FROM Subscription s JOIN FETCH s.plan WHERE s.company.id = :companyId AND s.status = :status")
    Optional<Subscription> findByCompanyIdAndStatusWithPlan(@Param("companyId") Long companyId, @Param("status") SubscriptionStatus status);

    List<Subscription> findAllByCurrentPeriodEndBeforeAndStatus(Instant time, SubscriptionStatus status);
}
