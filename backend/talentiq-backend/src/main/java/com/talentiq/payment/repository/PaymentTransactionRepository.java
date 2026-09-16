package com.talentiq.payment.repository;

import com.talentiq.payment.enums.PaymentTransactionStatus;
import com.talentiq.payment.model.PaymentTransaction;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByOrderId(String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentTransaction p WHERE p.orderId = :orderId")
    Optional<PaymentTransaction> findByOrderIdForUpdate(@Param("orderId") String orderId);

    Optional<PaymentTransaction> findByGatewayOrderId(String gatewayOrderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentTransaction p WHERE p.gatewayOrderId = :gatewayOrderId")
    Optional<PaymentTransaction> findByGatewayOrderIdForUpdate(@Param("gatewayOrderId") String gatewayOrderId);
    
    Optional<PaymentTransaction> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT p FROM PaymentTransaction p JOIN FETCH p.plan WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    Page<PaymentTransaction> findByUserIdWithPlanOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT p FROM PaymentTransaction p JOIN FETCH p.plan WHERE p.user.id = :userId " +
           "AND (:status IS NULL OR p.status = :status) " +
           "AND (:search IS NULL OR LOWER(p.orderId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR (p.gatewayPaymentId IS NOT NULL AND LOWER(p.gatewayPaymentId) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "     OR LOWER(p.plan.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY p.createdAt DESC")
    Page<PaymentTransaction> findByUserIdWithFilters(
            @Param("userId") Long userId,
            @Param("status") PaymentTransactionStatus status,
            @Param("search") String search,
            Pageable pageable);
}
