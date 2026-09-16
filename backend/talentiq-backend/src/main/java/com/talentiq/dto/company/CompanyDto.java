package com.talentiq.dto.company;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

public class CompanyDto {

    @Data
    public static class RegisterRequest {
        @NotBlank(message = "Company name is required")
        @Size(max = 200)
        private String name;

        @NotBlank(message = "Company slug is required")
        @Size(max = 200)
        private String slug;

        @Size(max = 500)
        private String website;

        @Size(max = 100)
        private String industry;

        @Size(max = 30)
        private String companySize;

        private String description;

        @Size(max = 200)
        private String location;

        private Integer foundedYear;

        @Email(message = "Invalid email format")
        private String email;

        @Size(max = 20)
        private String phone;
    }

    @Data
    public static class UpdateRequest {
        @Size(max = 200)
        private String name;

        @Size(max = 500)
        private String website;

        @Size(max = 100)
        private String industry;

        @Size(max = 30)
        private String companySize;

        private String description;

        @Size(max = 500)
        private String logoUrl;

        @Size(max = 500)
        private String bannerUrl;

        @Size(max = 200)
        private String location;

        private Integer foundedYear;

        @Email(message = "Invalid email format")
        private String email;

        @Size(max = 20)
        private String phone;

        @Size(max = 500)
        private String linkedinUrl;

        @Size(max = 500)
        private String twitterUrl;
    }

    @Data
    @Builder
    public static class Response {
        private Long id;
        private String name;
        private String slug;
        private String website;
        private String industry;
        private String companySize;
        private String description;
        private String logoUrl;
        private String bannerUrl;
        private String location;
        private Integer foundedYear;
        private String email;
        private String phone;
        private String linkedinUrl;
        private String twitterUrl;
        private boolean verified;
        private boolean active;
        private Instant createdAt;
    }
}
