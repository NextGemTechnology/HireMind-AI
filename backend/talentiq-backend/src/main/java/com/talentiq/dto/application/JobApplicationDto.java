package com.talentiq.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.talentiq.common.enums.ApplicationStatus;
import com.talentiq.dto.candidate.CandidateDto;
import com.talentiq.dto.job.JobDto;
import com.talentiq.dto.resume.ResumeDto;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class JobApplicationDto {

    @Data
    public static class ApplyRequest {
        @NotNull(message = "Job ID is required")
        private Long jobId;

        private Long resumeId; // If null, uses the candidate's active/primary resume
        private String coverLetter;
    }

    @Data
    public static class StatusUpdateRequest {
        @NotNull(message = "New application status is required")
        private ApplicationStatus status;

        private String notes;
        private Instant interviewDate;
        private LocalDate offerDate;
        private BigDecimal offerAmount;
        private String offerCurrency;
        private String rejectionReason;
        private String recruiterNotes;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Response {
        private Long id;
        private JobDto.Response job;
        private CandidateDto.Response candidate;
        private ResumeDto resume;
        private ApplicationStatus status;
        private String coverLetter;
        private BigDecimal aiMatchScore;
        private String recruiterNotes;
        private Instant interviewDate;
        private LocalDate offerDate;
        private BigDecimal offerAmount;
        private String offerCurrency;
        private String rejectionReason;
        private Instant appliedAt;
        private List<StatusHistoryResponse> statusHistory;
    }

    @Data
    @Builder
    public static class StatusHistoryResponse {
        private Long id;
        private ApplicationStatus fromStatus;
        private ApplicationStatus toStatus;
        private String notes;
        private Instant createdAt;
        private String changedByEmail;
    }
}
