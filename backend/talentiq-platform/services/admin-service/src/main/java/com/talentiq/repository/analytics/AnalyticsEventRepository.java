package com.talentiq.repository.analytics;

import com.talentiq.model.AnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {
    long countByEventType(String eventType);
    long countByCreatedAtAfter(Instant after);
}
