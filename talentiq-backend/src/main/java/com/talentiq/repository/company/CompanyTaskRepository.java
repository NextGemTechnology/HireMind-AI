package com.talentiq.repository.company;

import com.talentiq.model.CompanyTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompanyTaskRepository extends JpaRepository<CompanyTask, Long> {

    List<CompanyTask> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<CompanyTask> findByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, String status);

    List<CompanyTask> findByCompanyIdAndAssignedToUserIdOrderByCreatedAtDesc(Long companyId, Long assignedToUserId);

    @Query("SELECT COUNT(t) FROM CompanyTask t WHERE t.company.id = :companyId AND t.status = 'COMPLETED'")
    long countCompletedByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(t) FROM CompanyTask t WHERE t.company.id = :companyId")
    long countTotalByCompanyId(@Param("companyId") Long companyId);
}
