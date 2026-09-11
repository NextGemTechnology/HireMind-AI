package com.talentiq.repository.subscription;

import com.talentiq.common.enums.TargetRole;
import com.talentiq.model.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {
    
    Optional<SubscriptionPlan> findByPlanCode(String planCode);
    
    List<SubscriptionPlan> findByTargetRoleAndActiveTrueOrderByDisplayOrderAsc(TargetRole targetRole);
    
    List<SubscriptionPlan> findByActiveTrueOrderByDisplayOrderAsc();
}
