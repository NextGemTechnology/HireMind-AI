package com.talentiq.repository.employee;

import com.talentiq.model.EmployeeStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeStatusHistoryRepository extends JpaRepository<EmployeeStatusHistory, Long> {

    @Query("SELECT h FROM EmployeeStatusHistory h " +
            "LEFT JOIN FETCH h.changedBy " +
            "WHERE h.employee.id = :employeeId " +
            "ORDER BY h.createdAt DESC")
    List<EmployeeStatusHistory> findByEmployeeIdOrderByCreatedAtDesc(@Param("employeeId") Long employeeId);
}
