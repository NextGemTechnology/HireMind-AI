package com.talentiq.model;
import lombok.*;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Represents a scheduled interview slot created by an HR user for a candidate.
 * Drives the HR Calendar view and triggers confirmation emails.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "interview_slots",
        indexes = {
                @Index(name = "idx_interview_hr_user_id", columnList = "hr_user_id"),
                @Index(name = "idx_interview_candidate_user_id", columnList = "candidate_user_id"),
                @Index(name = "idx_interview_application_id", columnList = "application_id"),
                @Index(name = "idx_interview_scheduled_at", columnList = "scheduled_at")
        }
)
@Builder
public class InterviewSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "hr_user_id", nullable = false)
    private Long hrUserId;

    @Column(name = "hr_name", nullable = false, length = 200)
    private String hrName;

    @Column(name = "candidate_user_id", nullable = false)
    private Long candidateUserId;

    @Column(name = "candidate_name", nullable = false, length = 200)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false, length = 255)
    private String candidateEmail;

    @Column(name = "job_title", nullable = false, length = 200)
    private String jobTitle;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_minutes", nullable = false)
    @Builder.Default
    private int durationMinutes = 60;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /**
     * PENDING — created, email sent
     * CONFIRMED — candidate confirmed
     * CANCELLED — cancelled by either party
     */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "reminder_sent", nullable = false)
    @Builder.Default
    private boolean reminderSent = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
