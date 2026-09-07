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
