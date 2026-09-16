package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.model.Candidate;
import jakarta.persistence.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "resumes",
        indexes = {
                @Index(name = "idx_resumes_candidate_id", columnList = "candidate_id"),
                @Index(name = "idx_resumes_is_active", columnList = "is_active"),
                @Index(name = "idx_resumes_is_parsed", columnList = "is_parsed"),
                @Index(name = "idx_resumes_created_at", columnList = "created_at")
        }
)
@Builder
public class Resume extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "version_name", nullable = false, length = 100)
    @Builder.Default
    private String versionName = "Default";

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "file_url", nullable = false, length = 1000)
    private String fileUrl;

    @Column(name = "file_type", nullable = false, length = 100)
    private String fileType;

    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_parsed", nullable = false)
    @Builder.Default
    private boolean parsed = false;

    @Column(name = "parse_status", nullable = false, length = 20)
    @Builder.Default
    private String parseStatus = "PENDING"; // PENDING, IN_PROGRESS, DONE, FAILED

    @Column(name = "parse_error", columnDefinition = "TEXT")
    private String parseError;
}
