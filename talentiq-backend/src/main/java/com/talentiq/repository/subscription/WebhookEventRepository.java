package com.talentiq.repository.subscription;

import com.talentiq.model.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {
    
    boolean existsByEventId(String eventId);
}
