package com.talentiq.repository.employee;

import com.talentiq.common.enums.SalaryStatus;
import com.talentiq.model.SalaryDisbursement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryDisbursementRepository extends JpaRepository<SalaryDisbursement, Long> {

    @Query("SELECT s.currency, s.status, COUNT(s), SUM(s.amount) FROM SalaryDisbursement s WHERE s.company.id = :companyId GROUP BY s.currency, s.status")
    List<Object[]> summarizeByCurrencyAndStatus(@Param("companyId") Long companyId);

    @Query("SELECT s FROM SalaryDisbursement s " +
            "JOIN FETCH s.employee e " +
            "JOIN FETCH e.user u " +
            "WHERE s.company.id = :companyId AND (:status IS NULL OR s.status = :status)")
    Page<SalaryDisbursement> findByCompanyIdAndStatus(
            @Param("companyId") Long companyId,
            @Param("status") SalaryStatus status,
            Pageable pageable);

    @Query("SELECT s FROM SalaryDisbursement s " +
            "JOIN FETCH s.company c " +
            "WHERE s.employee.id = :employeeId " +
            "ORDER BY s.createdAt DESC")
    List<SalaryDisbursement> findByEmployeeIdOrderByCreatedAtDesc(@Param("employeeId") Long employeeId);

    @Query("SELECT s FROM SalaryDisbursement s " +
            "JOIN FETCH s.company c " +
            "JOIN FETCH s.employee e " +
            "WHERE e.user.id = :userId AND s.status = 'COMPLETED' " +
            "ORDER BY s.createdAt DESC")
    List<SalaryDisbursement> findCompletedByUserId(@Param("userId") Long userId);

    long countByCompanyIdAndStatus(Long companyId, SalaryStatus status);

    Optional<SalaryDisbursement> findByTransactionRef(String transactionRef);
}
