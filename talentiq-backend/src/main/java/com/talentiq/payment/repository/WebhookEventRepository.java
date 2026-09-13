package com.talentiq.payment.repository;

import com.talentiq.payment.model.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {
    
    boolean existsByEventId(String eventId);
}
