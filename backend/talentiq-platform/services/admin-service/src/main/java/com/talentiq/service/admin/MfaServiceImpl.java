package com.talentiq.service.admin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.model.MfaConfig;
import com.talentiq.repository.admin.MfaConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base32;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MfaServiceImpl implements MfaService {

    private final MfaConfigRepository mfaConfigRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String STEP_UP_PREFIX = "stepup:mfa:";
    private static final Duration STEP_UP_VALIDITY = Duration.ofMinutes(5);
    private static final String APP_NAME = "HireMind";

    private final SecureRandom secureRandom = new SecureRandom();
    private final Base32 base32 = new Base32();

    @Override
    @Transactional
    public Map<String, Object> setupTotp(Long userId, String userEmail) {
        byte[] secretBytes = new byte[20];
        secureRandom.nextBytes(secretBytes);
        String secret = base32.encodeToString(secretBytes).replace("=", "");

        List<String> backupCodes = generateRawBackupCodes();

        try {
            String backupCodesJson = objectMapper.writeValueAsString(backupCodes);
            Optional<MfaConfig> existing = mfaConfigRepository.findByUserId(userId);
            MfaConfig config = existing.orElse(MfaConfig.builder().userId(userId).build());
            config.setTotpSecret(secret);
            config.setEnabled(false);
            config.setBackupCodes(backupCodesJson);
            config.setCreatedAt(Instant.now());
            mfaConfigRepository.save(config);

            String qrUri = String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                    APP_NAME, userEmail, secret, APP_NAME);

            Map<String, Object> response = new HashMap<>();
            response.put("secret", secret);
            response.put("qrUri", qrUri);
            response.put("backupCodes", backupCodes);
            return response;
        } catch (Exception ex) {
            log.error("Failed to generate MFA setup for user: {}", userId, ex);
            throw new RuntimeException("Could not initialize MFA setup", ex);
        }
    }

    @Override
    @Transactional
    public boolean verifyAndEnableTotp(Long userId, String code) {
        Optional<MfaConfig> configOpt = mfaConfigRepository.findByUserId(userId);
        if (configOpt.isEmpty()) return false;

        MfaConfig config = configOpt.get();
        if (validateCode(config.getTotpSecret(), code)) {
            config.setEnabled(true);
            config.setVerifiedAt(Instant.now());
            mfaConfigRepository.save(config);
            recordStepUpVerification(userId);
            return true;
        }
        return false;
    }

    @Override
    @Transactional
    public boolean verifyTotp(Long userId, String code) {
        Optional<MfaConfig> configOpt = mfaConfigRepository.findByUserId(userId);
        if (configOpt.isEmpty() || !configOpt.get().isEnabled()) return false;

        MfaConfig config = configOpt.get();
        // Check TOTP code
        if (validateCode(config.getTotpSecret(), code)) {
            recordStepUpVerification(userId);
            return true;
        }

        // Check backup codes
        if (tryConsumeBackupCode(config, code)) {
            mfaConfigRepository.save(config);
            recordStepUpVerification(userId);
            return true;
        }

        return false;
    }

    @Override
    @Transactional
    public boolean disableTotp(Long userId, String code) {
        if (verifyTotp(userId, code)) {
            mfaConfigRepository.findByUserId(userId).ifPresent(config -> {
                config.setEnabled(false);
                config.setTotpSecret("");
                mfaConfigRepository.save(config);
            });
            return true;
        }
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isMfaEnabled(Long userId) {
        return mfaConfigRepository.existsByUserIdAndEnabledTrue(userId);
    }

    @Override
    @Transactional
    public List<String> regenerateBackupCodes(Long userId) {
        Optional<MfaConfig> configOpt = mfaConfigRepository.findByUserId(userId);
        if (configOpt.isEmpty() || !configOpt.get().isEnabled()) {
            throw new IllegalStateException("MFA must be active to generate backup codes");
        }
        List<String> newCodes = generateRawBackupCodes();
        try {
            configOpt.get().setBackupCodes(objectMapper.writeValueAsString(newCodes));
            mfaConfigRepository.save(configOpt.get());
            return newCodes;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to persist backup codes", ex);
        }
    }

    @Override
    public void recordStepUpVerification(Long userId) {
        try {
            redisTemplate.opsForValue().set(STEP_UP_PREFIX + userId, "VALID", STEP_UP_VALIDITY);
        } catch (Exception ex) {
            log.warn("Redis step-up cache error for user: {}", userId);
        }
    }

    @Override
    public boolean isStepUpValid(Long userId) {
        try {
            return "VALID".equals(redisTemplate.opsForValue().get(STEP_UP_PREFIX + userId));
        } catch (Exception ex) {
            log.warn("Redis step-up lookup error: {}", ex.getMessage());
            return false;
        }
    }

    // ── Internal TOTP Cryptographic Verification (RFC 6238) ──

    private boolean validateCode(String secret, String codeStr) {
        if (secret == null || codeStr == null || codeStr.trim().length() != 6) return false;
        try {
            int code = Integer.parseInt(codeStr.trim());
            byte[] key = base32.decode(secret);
            long currentWindow = Instant.now().getEpochSecond() / 30;

            // Check current window and +/- 1 window for clock drift tolerance
            for (int i = -1; i <= 1; i++) {
                if (generateTotpCode(key, currentWindow + i) == code) {
                    return true;
                }
            }
        } catch (Exception ex) {
            log.warn("Invalid TOTP verification format: {}", ex.getMessage());
        }
        return false;
    }

    private int generateTotpCode(byte[] key, long timeWindow) throws Exception {
        byte[] data = ByteBuffer.allocate(8).putLong(timeWindow).array();
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "RAW"));
        byte[] hash = mac.doFinal(data);

        int offset = hash[hash.length - 1] & 0xF;
        int binary = ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);

        return binary % 1000000;
    }

    private List<String> generateRawBackupCodes() {
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < 8; j++) {
                int digit = secureRandom.nextInt(10);
                sb.append(digit);
            }
            codes.add(sb.toString());
        }
        return codes;
    }

    private boolean tryConsumeBackupCode(MfaConfig config, String candidateCode) {
        if (config.getBackupCodes() == null) return false;
        try {
            List<String> codes = objectMapper.readValue(config.getBackupCodes(), new TypeReference<List<String>>() {});
            if (codes.remove(candidateCode.trim())) {
                config.setBackupCodes(objectMapper.writeValueAsString(codes));
                return true;
            }
        } catch (Exception ex) {
            log.error("Error reading backup codes for user: {}", config.getUserId(), ex);
        }
        return false;
    }
}
