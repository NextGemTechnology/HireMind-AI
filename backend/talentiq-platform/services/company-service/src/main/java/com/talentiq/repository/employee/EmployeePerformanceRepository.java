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

    @Query("SELECT r.ratingCategory, COUNT(r), SUM(r.rating) FROM EmployeePerformanceReview r WHERE r.company.id = :companyId GROUP BY r.ratingCategory")
    List<Object[]> summarizeRatings(@Param("companyId") Long companyId);

    @Query("SELECT COALESCE(r.employee.department, 'Unassigned'), AVG(r.rating), COUNT(r) FROM EmployeePerformanceReview r WHERE r.company.id = :companyId GROUP BY r.employee.department")
    List<Object[]> summarizeDepartments(@Param("companyId") Long companyId);

    @Query(value = "SELECT DATE_FORMAT(reviewed_at, '%Y-%m'), SUM(rating_category = 'EXCELLENT'), SUM(rating_category = 'GOOD'), SUM(rating_category = 'AVERAGE'), SUM(rating_category = 'NEEDS_IMPROVEMENT') FROM employee_performance_reviews WHERE company_id = :companyId AND reviewed_at >= :since GROUP BY DATE_FORMAT(reviewed_at, '%Y-%m') ORDER BY 1", nativeQuery = true)
    List<Object[]> summarizeMonths(@Param("companyId") Long companyId, @Param("since") java.time.Instant since);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"company", "employee", "employee.user", "reviewerUser"})
    Page<EmployeePerformanceReview> findByCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);

    List<EmployeePerformanceReview> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<EmployeePerformanceReview> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    long countByCompanyIdAndRatingCategory(Long companyId, String ratingCategory);

    long countByCompanyId(Long companyId);

    @Query("SELECT r.ratingCategory, COUNT(r) FROM EmployeePerformanceReview r WHERE r.company.id = :companyId GROUP BY r.ratingCategory")
    List<Object[]> getCategoryCountsByCompanyId(@Param("companyId") Long companyId);
}
