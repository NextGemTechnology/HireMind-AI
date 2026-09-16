package com.talentiq.ai.model;
import com.talentiq.model.Candidate;
import lombok.*;

import com.talentiq.model.Company;
import com.talentiq.model.User;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "ai_conversations",
        indexes = {
                @Index(name = "idx_ai_conversations_hr_id", columnList = "hr_id"),
                @Index(name = "idx_ai_conversations_company_id", columnList = "company_id"),
                @Index(name = "idx_ai_conversations_is_archived", columnList = "is_archived"),
                @Index(name = "idx_ai_conversations_updated_at", columnList = "updated_at")
        }
)
@Builder
public class AiConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_id")
    private User hr;

    @Column(name = "user_type", nullable = false, length = 20)
    @Builder.Default
    private String userType = "HR"; // HR or CANDIDATE

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id")
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(length = 300)
    private String title;

    @Column(name = "context_type", nullable = false, length = 30)
    @Builder.Default
    private String contextType = "GENERAL"; // GENERAL, CANDIDATE, JOB, ANALYSIS

    @Column(name = "context_id")
    private Long contextId;

    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private boolean pinned = false;

    @Column(name = "is_archived", nullable = false)
    @Builder.Default
    private boolean archived = false;

    @Column(name = "chat_enabled", nullable = false)
    @Builder.Default
    private boolean chatEnabled = true;

    @Column(name = "message_count", nullable = false)
    @Builder.Default
    private Integer messageCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    @Builder.Default
    private List<AiMessage> messages = new ArrayList<>();

    public void incrementMessageCount() {
        this.messageCount++;
        this.updatedAt = Instant.now();
    }
}
