package com.talentiq.dto.application;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmailRequest {
    @NotBlank(message = "Email body is required")
    private String body;
}
