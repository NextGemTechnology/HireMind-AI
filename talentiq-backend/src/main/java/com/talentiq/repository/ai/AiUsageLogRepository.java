package com.talentiq.repository.ai;

import com.talentiq.model.AiUsageLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long> {

    Page<AiUsageLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<AiUsageLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(l.totalTokens), 0) FROM AiUsageLog l WHERE l.userId = :userId AND l.createdAt >= :after")
    long sumTokensByUserIdSince(@Param("userId") Long userId, @Param("after") Instant after);

    @Query("SELECT COALESCE(SUM(l.totalTokens), 0) FROM AiUsageLog l WHERE l.companyId = :companyId AND l.createdAt >= :after")
    long sumTokensByCompanyIdSince(@Param("companyId") Long companyId, @Param("after") Instant after);
}
