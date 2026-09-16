package com.talentiq.repository.employee;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.model.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @Query("SELECT e FROM Employee e JOIN FETCH e.company JOIN FETCH e.user u LEFT JOIN FETCH e.hrProfile " +
            "WHERE e.company.id = :companyId AND (:status IS NULL OR e.status = :status) " +
            "AND (:terminationStatus IS NULL OR e.terminationStatus = :terminationStatus) " +
            "AND (:search = '' OR LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(e.department) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Employee> searchCompanyEmployees(@Param("companyId") Long companyId, @Param("status") EmployeeStatus status,
            @Param("terminationStatus") String terminationStatus, @Param("search") String search, Pageable pageable);

    @Query("SELECT COALESCE(e.department, 'Unassigned'), COUNT(e) FROM Employee e WHERE e.company.id = :companyId GROUP BY e.department ORDER BY COUNT(e) DESC")
    List<Object[]> countByDepartment(@Param("companyId") Long companyId);

    @Query("SELECT e.status, COUNT(e) FROM Employee e WHERE e.company.id = :companyId GROUP BY e.status")
    List<Object[]> countByEmployeeStatus(@Param("companyId") Long companyId);

    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m'), COUNT(*) FROM employees WHERE company_id = :companyId AND created_at >= :since GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY 1", nativeQuery = true)
    List<Object[]> monthlyOnboarding(@Param("companyId") Long companyId, @Param("since") java.time.Instant since);

    Optional<Employee> findByCompanyIdAndUserId(Long companyId, Long userId);

    Optional<Employee> findByEmployeeCode(String employeeCode);

    boolean existsByCompanyIdAndUserId(Long companyId, Long userId);

    @Query("SELECT e FROM Employee e " +
            "JOIN FETCH e.company c " +
            "JOIN FETCH e.user u " +
            "LEFT JOIN FETCH e.hrProfile h " +
            "WHERE e.company.id = :companyId AND (:status IS NULL OR e.status = :status)")
    Page<Employee> findByCompanyIdAndStatus(
            @Param("companyId") Long companyId,
            @Param("status") EmployeeStatus status,
            Pageable pageable);

    @Query("SELECT e FROM Employee e " +
            "JOIN FETCH e.company c " +
            "WHERE e.user.id = :userId")
    List<Employee> findByUserId(@Param("userId") Long userId);

    @Query("SELECT e FROM Employee e " +
            "JOIN FETCH e.company c " +
            "WHERE e.user.id = :userId AND e.status = 'ACTIVE'")
    List<Employee> findActiveByUserId(@Param("userId") Long userId);

    long countByCompanyIdAndStatus(Long companyId, EmployeeStatus status);

    long countByCompanyId(Long companyId);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.company.id = :companyId AND e.terminationStatus = 'PENDING_APPROVAL'")
    long countPendingTerminationsByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT e FROM Employee e " +
            "JOIN FETCH e.company c " +
            "JOIN FETCH e.user u " +
            "WHERE e.company.id = :companyId AND e.terminationStatus = 'PENDING_APPROVAL'")
    List<Employee> findPendingTerminationsByCompanyId(@Param("companyId") Long companyId);
}
