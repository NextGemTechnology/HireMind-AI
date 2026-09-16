package com.talentiq.repository.interview;

import com.talentiq.model.InterviewSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewSlotRepository extends JpaRepository<InterviewSlot, Long> {

    /** All interviews for an HR user sorted chronologically (ascending) */
    List<InterviewSlot> findByHrUserIdOrderByScheduledAtAsc(Long hrUserId);

    /** All interviews for an HR user sorted newest first (descending) */
    List<InterviewSlot> findByHrUserIdOrderByScheduledAtDesc(Long hrUserId);

    /** Interviews in a date range for an HR user */
    List<InterviewSlot> findByHrUserIdAndScheduledAtBetweenOrderByScheduledAtAsc(
            Long hrUserId, Instant from, Instant to
    );

    /** Slot tied to a specific job application */
    Optional<InterviewSlot> findByApplicationId(Long applicationId);

    /** Upcoming (future) interviews for an HR user */
    List<InterviewSlot> findByHrUserIdAndScheduledAtAfterAndStatusNotOrderByScheduledAtAsc(
            Long hrUserId, Instant now, String excludedStatus
    );

    /** Interviews not yet reminded, upcoming within a time window */
    List<InterviewSlot> findByReminderSentFalseAndScheduledAtBetween(Instant from, Instant to);
}
