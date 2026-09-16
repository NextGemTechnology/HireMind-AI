package com.talentiq.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

/**
 * Typed configuration properties bound to the 'app.*' namespace.
 * Provides type-safe access to all custom application properties.
 * Validated at startup — fails fast on misconfiguration.
 */
@Data
@Validated
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String name = "TalentIQ";
    private String version = "1.0.0";
    private JwtProperties jwt = new JwtProperties();
    private StorageProperties storage = new StorageProperties();
    private AiProperties ai = new AiProperties();
    private RateLimitProperties rateLimit = new RateLimitProperties();
    private MailProperties mail = new MailProperties();
    private FrontendProperties frontend = new FrontendProperties();
    private AdminProperties admin = new AdminProperties();

    @Data
    public static class JwtProperties {
        private String secret;
        private long accessTokenExpiryMs = 900_000L;      // 15 min
        private int refreshTokenExpiryDays = 7;
    }

    @Data
    public static class StorageProperties {
        private String provider = "local";
        private LocalStorage local = new LocalStorage();
        private S3Storage s3 = new S3Storage();
        private long maxFileSizeBytes = 10_485_760L;
        private String allowedResumeTypes;
        private String allowedImageTypes;

        @Data
        public static class LocalStorage {
            private String basePath = "./uploads";
        }

        @Data
        public static class S3Storage {
            private String bucket;
            private String region;
            private String accessKey;
            private String secretKey;
        }
    }

    @Data
    public static class AiProperties {
        private String provider = "openai";
        private OpenAiProperties openai = new OpenAiProperties();
        private GeminiProperties gemini = new GeminiProperties();
        private OllamaProperties ollama = new OllamaProperties();
        private AgentProperties agents = new AgentProperties();

        @Data
        public static class AgentProperties {
            private String hrModel = "gpt-4o";
            private String candidateModel = "gpt-4o-mini";
            private String developerModel = "gpt-4o";
            private int chatRetentionDays = 90;
            private int cacheTtlMinutes = 30;
            private boolean trainingEnabled = false;
            private int maxTokensPerUserDaily = 50000;
            private int maxRequestsPerMinute = 10;
        }

        @Data
        public static class OpenAiProperties {
            private String apiKey;
            private String model = "gpt-4o";
            private String embeddingModel = "text-embedding-3-small";
            private int maxTokens = 4096;
            private double temperature = 0.7;
        }

        @Data
        public static class GeminiProperties {
            private String apiKey;
            private String model = "gemini-1.5-pro";
        }

        @Data
        public static class OllamaProperties {
            private String baseUrl = "http://localhost:11434";
            private String model = "llama3.2";
        }
    }

    @Data
    public static class RateLimitProperties {
        private boolean enabled = true;
        private int defaultCapacity = 60;
        private int defaultRefillPerMinute = 60;
        private int loginCapacity = 10;
        private int loginRefillPerMinute = 10;
    }

    @Data
    public static class MailProperties {
        private String from = "noreply@talentiq.ai";
        private String fromName = "TalentIQ Platform";
        private int verificationExpiryMinutes = 30;
        private int resetPasswordExpiryMinutes = 15;
    }

    @Data
    public static class FrontendProperties {
        private String baseUrl = "http://localhost:3000";
    }

    @Data
    public static class AdminProperties {
        private String defaultEmail = "admin@talentiq.ai";
        private String defaultPassword;
    }
}
