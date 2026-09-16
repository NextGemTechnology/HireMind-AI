package com.talentiq.dto.resume;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ResumeDto {
    private Long id;
    private Long candidateId;
    private String versionName;
    private String originalName;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
    private boolean active;
    private boolean parsed;
    private String parseStatus;
    private String parseError;
    private Instant createdAt;
}
