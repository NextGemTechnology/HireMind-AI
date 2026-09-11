package com.talentiq.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.payment")
public class PaymentConfig {

    private String gateway = "mock"; // razorpay | mock
    private Razorpay razorpay = new Razorpay();

    @Data
    public static class Razorpay {
        private String keyId;
        private String keySecret;
        private String webhookSecret;
    }
}
