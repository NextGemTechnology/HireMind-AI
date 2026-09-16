package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "company_tasks",
        indexes = {
                @Index(name = "idx_comp_tasks_company_status", columnList = "company_id, status"),
                @Index(name = "idx_comp_tasks_assigned_user", columnList = "assigned_to_user_id"),
                @Index(name = "idx_comp_tasks_due_date", columnList = "due_date")
        }
)
@Builder
public class CompanyTask extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_user_id", nullable = false)
    private User creatorUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_user_id")
    private User assignedToUser;

    @Column(name = "assigned_to_name", length = 200)
    private String assignedToName;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String priority = "MEDIUM"; // HIGH, MEDIUM, LOW

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "GENERAL"; // HIRING, INTERVIEW, COMPLIANCE, GENERAL

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "TODO"; // TODO, IN_PROGRESS, COMPLETED

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "completed_at")
    private Instant completedAt;
}
