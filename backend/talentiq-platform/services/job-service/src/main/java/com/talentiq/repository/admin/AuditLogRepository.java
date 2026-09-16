package com.talentiq.repository.admin;

import com.talentiq.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AuditLog> findByActorUserIdOrderByCreatedAtDesc(Long actorUserId, Pageable pageable);

    Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);

    Page<AuditLog> findByResourceTypeOrderByCreatedAtDesc(String resourceType, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.createdAt BETWEEN :from AND :to ORDER BY a.createdAt DESC")
    Page<AuditLog> findByDateRange(@Param("from") Instant from, @Param("to") Instant to, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.actorUserId = :userId AND a.action = :action ORDER BY a.createdAt DESC")
    List<AuditLog> findRecentByUserAndAction(@Param("userId") Long userId, @Param("action") String action, Pageable pageable);

    long countByAction(String action);

    long countByResult(String result);

    long countByCreatedAtAfter(Instant after);
}
