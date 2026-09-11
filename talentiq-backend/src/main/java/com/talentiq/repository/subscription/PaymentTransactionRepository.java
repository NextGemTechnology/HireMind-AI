package com.talentiq.repository.subscription;

import com.talentiq.model.PaymentTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByOrderId(String orderId);

    Optional<PaymentTransaction> findByGatewayOrderId(String gatewayOrderId);
    
    Optional<PaymentTransaction> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT p FROM PaymentTransaction p JOIN FETCH p.plan WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    Page<PaymentTransaction> findByUserIdWithPlanOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);
}
