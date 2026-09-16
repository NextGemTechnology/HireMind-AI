package com.talentiq.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * SpringDoc / OpenAPI 3.1 configuration.
 * Accessible at /swagger-ui.html (dev profile).
 */
@Configuration
public class SwaggerConfig {

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendUrl;

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(apiInfo())
                .servers(List.of(
                        new Server().url("/api").description("Current server"),
                        new Server().url("http://localhost:8080/api").description("Local development")
                ))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Provide your JWT access token")
                        )
                )
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
    }

    private Info apiInfo() {
        return new Info()
                .title("TalentIQ — AI Talent Intelligence Platform API")
                .version("1.0.0")
                .description("""
                        Enterprise-grade AI Talent Intelligence Platform.
                        
                        Combines Personal Portfolio, AI Resume Builder, Resume Parser,
                        Job Portal, HR Recruitment Platform, AI Copilot, Candidate Intelligence,
                        Job Recommendation Engine, and Analytics into one unified application.
                        """)
                .contact(new Contact()
                        .name("TalentIQ Engineering")
                        .email("engineering@talentiq.ai")
                        .url(frontendUrl))
                .license(new License()
                        .name("Proprietary")
                        .url(frontendUrl));
    }
}
