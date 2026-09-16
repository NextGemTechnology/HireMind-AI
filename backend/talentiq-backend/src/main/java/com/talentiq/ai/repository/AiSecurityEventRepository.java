package com.talentiq.ai.repository;
import com.talentiq.ai.model.*;

import com.talentiq.ai.model.AiSecurityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AiSecurityEventRepository extends JpaRepository<AiSecurityEvent, Long> {

    Page<AiSecurityEvent> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<AiSecurityEvent> findByUserIdAndCreatedAtAfter(Long userId, Instant after);

    long countByUserIdAndEventTypeAndCreatedAtAfter(Long userId, String eventType, Instant after);

    long countByEventType(String eventType);
}
