package com.talentiq.dto.company;

import com.talentiq.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;

public class CompanyInvitationDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        @NotBlank(message = "Recipient email is required")
        @Email(message = "Invalid email format")
        private String email;

        private String recipientName;

        @NotNull(message = "Role is required")
        private Role role; // ROLE_HR or ROLE_CANDIDATE

        private String designation; // e.g. "Senior Technical Recruiter", "Full-Stack Engineer"

        @Builder.Default
        private boolean autoVerifyBadge = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DirectAffiliateHrRequest {
        @NotBlank(message = "HR Recruiter email is required")
        @Email(message = "Invalid email format")
        private String email;

        private String designation;

        @Builder.Default
        private boolean autoVerifyBadge = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DirectCandidateInviteRequest {
        @NotBlank(message = "Candidate email is required")
        @Email(message = "Invalid email format")
        private String email;

        private String candidateName;
        private String proposedJobTitle;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyHrBadgeRequest {
        private boolean verified;
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
        private String companySlug;
        private String email;
        private String recipientName;
        private String role;
        private String designation;
        private String inviteToken;
        private String inviteLink;
        private String status;
        private boolean autoVerifyBadge;
        private Instant expiresAt;
        private Instant acceptedAt;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ValidateResponse {
        private boolean valid;
        private Long companyId;
        private String companyName;
        private String companySlug;
        private String email;
        private String role;
        private String designation;
        private boolean autoVerifyBadge;
        private String message;
    }
}
