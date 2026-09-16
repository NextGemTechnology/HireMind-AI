package com.talentiq;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * TalentIQ — AI Talent Intelligence Platform
 * Entry point for the Spring Boot 3 application.
 */
@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
public class TalentIqApplication {

    public static void main(String[] args) {
        SpringApplication.run(TalentIqApplication.class, args);
    }
}
