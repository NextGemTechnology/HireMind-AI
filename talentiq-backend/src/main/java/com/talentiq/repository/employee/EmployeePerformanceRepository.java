package com.talentiq.repository.employee;

import com.talentiq.model.EmployeePerformanceReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeePerformanceRepository extends JpaRepository<EmployeePerformanceReview, Long> {

    Page<EmployeePerformanceReview> findByCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);

    List<EmployeePerformanceReview> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<EmployeePerformanceReview> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    long countByCompanyIdAndRatingCategory(Long companyId, String ratingCategory);

    long countByCompanyId(Long companyId);

    @Query("SELECT r.ratingCategory, COUNT(r) FROM EmployeePerformanceReview r WHERE r.company.id = :companyId GROUP BY r.ratingCategory")
    List<Object[]> getCategoryCountsByCompanyId(@Param("companyId") Long companyId);
}
