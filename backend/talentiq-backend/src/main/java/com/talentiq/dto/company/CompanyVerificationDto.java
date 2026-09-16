package com.talentiq.dto.company;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;

public class CompanyVerificationDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RequestTag {
        @NotNull(message = "Candidate user ID is required")
        private Long candidateUserId;

        @NotBlank(message = "Job title is required")
        private String jobTitle;

        private String department;
        private String skillsTagged;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ApproveRejectRequest {
        private boolean approved;
        private String rejectionReason;
        private String badgeTitle;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long id;
        private Long companyId;
        private String companyName;
        private String companyLogoUrl;
        private Long hrUserId;
        private String hrName;
        private Long candidateUserId;
        private String candidateName;
        private String candidateEmail;
        private String candidateAvatarUrl;
        private String jobTitle;
        private String department;
        private String status;
        private Instant requestedAt;
        private Instant approvedAt;
        private String approvedByName;
        private String rejectionReason;
        private String badgeCertificateId;
        private String skillsTagged;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyHrRequest {
        private boolean verified;
        private String badgeTitle;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HrMemberResponse {
        private Long hrProfileId;
        private Long userId;
        private String name;
        private String email;
        private String designation;
        private String department;
        private boolean companyAdmin;
        private boolean companyVerified;
        private String companyVerifiedTitle;
        private Instant companyVerifiedAt;
        private boolean active;
    }
}
