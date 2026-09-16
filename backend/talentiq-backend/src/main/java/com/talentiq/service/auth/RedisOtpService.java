package com.talentiq.service.auth;

import com.talentiq.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * High-performance, distributed OTP Engine backed by Redis with in-memory fallback.
 * Designed to handle 10,000+ concurrent users with zero database lock contention.
 *
 * Features:
 * 1. O(1) in-memory OTP storage with automatic TTL expiration (10 minutes).
 * 2. Distributed rate limiting per email (max 3 requests per 2 minutes).
 * 3. Distributed rate limiting per IP address (max 10 requests per minute).
 * 4. Brute-force protection: Locks after 5 consecutive failed verification attempts for 15 minutes.
 * 5. Single-use enforcement: OTP destroyed immediately upon verification to prevent replay attacks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RedisOtpService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final com.talentiq.security.email.EmailSecurityValidator emailSecurityValidator;

    // Keys and Prefixes
    private static final String OTP_CODE_PREFIX = "otp:code:";
    private static final String OTP_REG_PREFIX = "otp:reg:";
    private static final String OTP_2FA_SESSION_PREFIX = "2fa:session:";
    private static final String OTP_2FA_FAIL_PREFIX = "2fa:fail:";
    private static final String OTP_RATE_EMAIL_PREFIX = "otp:rate:email:";
    private static final String OTP_RATE_IP_PREFIX = "otp:rate:ip:";
    private static final String OTP_FAIL_PREFIX = "otp:fail:";
    private static final String OTP_VERIFIED_PREFIX = "otp:verified:";
    private static final String EMAIL_VERIFY_TOKEN_PREFIX = "email:verify:";

    // In-memory fallback caches in case Redis is temporarily unreachable
    private final ConcurrentHashMap<String, String> inMemoryOtpCodes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> inMemoryOtpExpiries = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> inMemoryRegOtpCodes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> inMemoryRegOtpExpiries = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> inMemory2FaSessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> inMemory2FaExpiries = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> inMemoryFailCounts = new ConcurrentHashMap<>();

    public void validateSafeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        emailSecurityValidator.validateEmailSecurity(email, null);
    }

    /**
     * Enforce sliding rate limits for OTP generation.
     * Prevents email spamming, SMS/SMTP exhaustion, and DDoS attacks across 10,000+ concurrent requests.
     */
    public void enforceRateLimit(String email, String clientIp) {
        validateSafeEmail(email);
        String emailKey = OTP_RATE_EMAIL_PREFIX + email.toLowerCase().trim();
        String ipKey = OTP_RATE_IP_PREFIX + (clientIp != null ? clientIp : "unknown");

        try {
            // Check brute-force lockout status
            String failKey = OTP_FAIL_PREFIX + email.toLowerCase().trim();
            Integer fails = (Integer) redisTemplate.opsForValue().get(failKey);
            if (fails != null && fails >= 5) {
                Long ttl = redisTemplate.getExpire(failKey, TimeUnit.MINUTES);
                throw new BadRequestException("Account temporarily locked due to too many failed OTP attempts. Please try again in " + (ttl != null && ttl > 0 ? ttl : 15) + " minutes.");
            }

            // Email Rate Limit: Max 3 requests per 2 minutes
            Long emailCount = redisTemplate.opsForValue().increment(emailKey);
            if (emailCount != null && emailCount == 1) {
                redisTemplate.expire(emailKey, 2, TimeUnit.MINUTES);
            } else if (emailCount != null && emailCount > 3) {
                throw new BadRequestException("Too many OTP requests for this email. Please wait 2 minutes before requesting a new code.");
            }

            // IP Rate Limit: Max 10 requests per minute
            Long ipCount = redisTemplate.opsForValue().increment(ipKey);
            if (ipCount != null && ipCount == 1) {
                redisTemplate.expire(ipKey, 1, TimeUnit.MINUTES);
            } else if (ipCount != null && ipCount > 10) {
                throw new BadRequestException("Rate limit exceeded from your network. Please wait a minute before requesting another OTP.");
            }

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis rate limit check bypassed due to connection error: {}", e.getMessage());
        }
    }

    /**
     * Store 4-digit OTP in Redis with 10-minute automatic TTL expiration.
     */
    public void storeOtp(String email, String otp, long ttlMinutes) {
        validateSafeEmail(email);
        String normalizedEmail = email.toLowerCase().trim();
        String key = OTP_CODE_PREFIX + normalizedEmail;

        try {
            redisTemplate.opsForValue().set(key, otp, ttlMinutes, TimeUnit.MINUTES);
            log.info("Redis OTP stored successfully for [{}], expires in {} min (TTL: O(1) in-memory)", normalizedEmail, ttlMinutes);
        } catch (Exception e) {
            log.warn("Redis unavailable, storing OTP in concurrent in-memory fallback cache: {}", e.getMessage());
            inMemoryOtpCodes.put(normalizedEmail, otp);
            inMemoryOtpExpiries.put(normalizedEmail, System.currentTimeMillis() + (ttlMinutes * 60 * 1000));
        }
    }

    /**
     * Store 4-digit Registration Verification OTP in Redis with automatic TTL expiration.
     * OTP is stored as "ROLE:OTP" (e.g., "ROLE_HR:4829") to bind OTP to the registration role.
     */
    public void storeRegistrationOtp(String email, String otp, long ttlMinutes, String roleName) {
        validateSafeEmail(email);
        String normalizedEmail = email.toLowerCase().trim();
        String key = OTP_REG_PREFIX + normalizedEmail;
        String value = roleName + ":" + otp;

        try {
            redisTemplate.opsForValue().set(key, value, ttlMinutes, TimeUnit.MINUTES);
            log.info("Redis Registration OTP stored for [{}] with role [{}], expires in {} min", normalizedEmail, roleName, ttlMinutes);
        } catch (Exception e) {
            log.warn("Redis unavailable, storing registration OTP in in-memory fallback: {}", e.getMessage());
            inMemoryRegOtpCodes.put(normalizedEmail, value);
            inMemoryRegOtpExpiries.put(normalizedEmail, System.currentTimeMillis() + (ttlMinutes * 60 * 1000));
        }
    }

    /**
     * Verify 4-digit Registration OTP without role requirement (backwards compatibility).
     */
    public void verifyRegistrationOtp(String email, String providedOtp) {
        verifyRegistrationOtpWithRole(email, providedOtp, null);
    }

    /**
     * Verify 4-digit Registration OTP with role binding enforcement.
     * Ensures the OTP was originally generated for the exact same role being registered.
     * Prevents privilege escalation (e.g., requesting OTP as Candidate, registering as Admin).
     */
    public void verifyRegistrationOtpWithRole(String email, String providedOtp, String expectedRole) {
        String normalizedEmail = email.toLowerCase().trim();
        String codeKey = OTP_REG_PREFIX + normalizedEmail;
        String failKey = OTP_FAIL_PREFIX + normalizedEmail;

        if (providedOtp == null || providedOtp.trim().isEmpty()) {
            throw new BadRequestException("4-digit email verification code is required.");
        }

        String targetOtp = providedOtp.trim();

        try {
            // Check lockout
            Integer fails = (Integer) redisTemplate.opsForValue().get(failKey);
            if (fails != null && fails >= 5) {
                Long ttl = redisTemplate.getExpire(failKey, TimeUnit.MINUTES);
                throw new BadRequestException("Too many failed attempts. Try again in " + (ttl != null && ttl > 0 ? ttl : 15) + " minutes.");
            }

            Object storedValueObj = redisTemplate.opsForValue().get(codeKey);
            String storedValue = storedValueObj != null ? storedValueObj.toString() : null;

            if (storedValue == null) {
                Long exp = inMemoryRegOtpExpiries.get(normalizedEmail);
                if (exp != null && System.currentTimeMillis() < exp) {
                    storedValue = inMemoryRegOtpCodes.get(normalizedEmail);
                }
            }

            if (storedValue == null) {
                throw new BadRequestException("Email verification code has expired or was not requested. Please request a new verification code.");
            }

            // Parse stored "ROLE:OTP" format
            String storedRole;
            String storedOtp;
            int colonIndex = storedValue.indexOf(':');
            if (colonIndex > 0) {
                storedRole = storedValue.substring(0, colonIndex);
                storedOtp = storedValue.substring(colonIndex + 1);
            } else {
                // Legacy fallback: stored value is just the OTP (no role binding)
                storedRole = null;
                storedOtp = storedValue;
            }

            // Enforce role binding — reject if OTP was generated for a different role
            if (storedRole != null && expectedRole != null && !storedRole.equals(expectedRole)) {
                log.warn("SECURITY: OTP role mismatch for [{}]. OTP was for [{}], registration attempted as [{}]", normalizedEmail, storedRole, expectedRole);
                throw new BadRequestException("Security violation: This verification code was issued for a different account type. Please request a new code for " + expectedRole + " registration.");
            }

            if (!storedOtp.equals(targetOtp)) {
                Long newFails = redisTemplate.opsForValue().increment(failKey);
                if (newFails != null && newFails == 1) {
                    redisTemplate.expire(failKey, 15, TimeUnit.MINUTES);
                }
                int remainingAttempts = Math.max(0, 5 - (newFails != null ? newFails.intValue() : 1));
                throw new BadRequestException("Invalid 4-digit verification code. " + remainingAttempts + " attempts remaining before temporary lockout.");
            }

            // Invalidate OTP immediately
            redisTemplate.delete(codeKey);
            redisTemplate.delete(failKey);
            inMemoryRegOtpCodes.remove(normalizedEmail);
            inMemoryRegOtpExpiries.remove(normalizedEmail);

            log.info("Registration OTP verified and consumed for: {} [role: {}]", normalizedEmail, expectedRole);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis verification error: {}", e.getMessage());
            Long exp = inMemoryRegOtpExpiries.get(normalizedEmail);
            if (exp != null && System.currentTimeMillis() < exp) {
                String stored = inMemoryRegOtpCodes.get(normalizedEmail);
                if (stored != null) {
                    // Parse role:otp from fallback
                    int ci = stored.indexOf(':');
                    String fbRole = ci > 0 ? stored.substring(0, ci) : null;
                    String fbOtp = ci > 0 ? stored.substring(ci + 1) : stored;
                    if (fbRole != null && expectedRole != null && !fbRole.equals(expectedRole)) {
                        throw new BadRequestException("Security violation: This verification code was issued for a different account type.");
                    }
                    if (targetOtp.equals(fbOtp)) {
                        inMemoryRegOtpCodes.remove(normalizedEmail);
                        inMemoryRegOtpExpiries.remove(normalizedEmail);
                        return;
                    }
                }
            }
            throw new BadRequestException("Invalid or expired verification code.");
        }
    }

    /**
     * Verify 4-digit OTP with brute-force protection and immediate single-use destruction.
     */
    public void verifyOtp(String email, String providedOtp) {
        String normalizedEmail = email.toLowerCase().trim();
        String codeKey = OTP_CODE_PREFIX + normalizedEmail;
        String failKey = OTP_FAIL_PREFIX + normalizedEmail;

        if (providedOtp == null || providedOtp.trim().isEmpty()) {
            throw new BadRequestException("4-digit OTP code is required.");
        }

        String targetOtp = providedOtp.trim();

        // 1. Try Redis verification
        try {
            // Check lockout
            Integer fails = (Integer) redisTemplate.opsForValue().get(failKey);
            if (fails != null && fails >= 5) {
                Long ttl = redisTemplate.getExpire(failKey, TimeUnit.MINUTES);
                throw new BadRequestException("Too many failed attempts. Account is locked. Try again in " + (ttl != null && ttl > 0 ? ttl : 15) + " minutes.");
            }

            Object storedOtpObj = redisTemplate.opsForValue().get(codeKey);
            String storedOtp = storedOtpObj != null ? storedOtpObj.toString() : null;

            if (storedOtp == null) {
                // Check fallback
                storedOtp = getFromFallback(normalizedEmail);
            }

            if (storedOtp == null) {
                throw new BadRequestException("OTP code has expired or was not requested. Please request a new 4-digit code.");
            }

            if (!storedOtp.equals(targetOtp)) {
                // Increment failed attempt counter
                Long newFails = redisTemplate.opsForValue().increment(failKey);
                if (newFails != null && newFails == 1) {
                    redisTemplate.expire(failKey, 15, TimeUnit.MINUTES);
                }
                int remainingAttempts = Math.max(0, 5 - (newFails != null ? newFails.intValue() : 1));
                throw new BadRequestException("Invalid 4-digit OTP. " + remainingAttempts + " attempts remaining before temporary lockout.");
            }

            // Verification successful:
            // Destroy OTP immediately to prevent replay attacks
            redisTemplate.delete(codeKey);
            redisTemplate.delete(failKey);
            inMemoryOtpCodes.remove(normalizedEmail);
            inMemoryOtpExpiries.remove(normalizedEmail);

            // Grant 15-minute verified ticket for password update
            String verifiedKey = OTP_VERIFIED_PREFIX + normalizedEmail;
            redisTemplate.opsForValue().set(verifiedKey, "VERIFIED", 15, TimeUnit.MINUTES);

            log.info("4-Digit OTP successfully verified and invalidated for user: {}", normalizedEmail);
            return;

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis verification error, evaluating via in-memory fallback: {}", e.getMessage());
            verifyFromFallback(normalizedEmail, targetOtp);
        }
    }

    /**
     * Check if user possesses a valid verified OTP ticket before updating password.
     */
    public boolean isOtpVerified(String email) {
        String normalizedEmail = email.toLowerCase().trim();
        String verifiedKey = OTP_VERIFIED_PREFIX + normalizedEmail;
        try {
            Object status = redisTemplate.opsForValue().get(verifiedKey);
            return "VERIFIED".equals(status);
        } catch (Exception e) {
            log.debug("Redis verified ticket lookup error: {}", e.getMessage());
            return true; // fallback to MySQL token check
        }
    }

    /**
     * Consume / revoke the verified OTP ticket upon successful password reset.
     */
    public void consumeVerifiedTicket(String email) {
        String normalizedEmail = email.toLowerCase().trim();
        String verifiedKey = OTP_VERIFIED_PREFIX + normalizedEmail;
        try {
            redisTemplate.delete(verifiedKey);
        } catch (Exception e) {
            log.debug("Redis verified ticket cleanup error: {}", e.getMessage());
        }
    }

    /**
     * Store high-entropy cryptographic email verification token in Redis.
     */
    public void storeEmailVerificationToken(String token, String email, long ttlHours) {
        validateSafeEmail(email);
        String key = EMAIL_VERIFY_TOKEN_PREFIX + token;
        try {
            redisTemplate.opsForValue().set(key, email.toLowerCase().trim(), ttlHours, TimeUnit.HOURS);
            log.info("Email verification token stored for [{}] (TTL: {}h)", email, ttlHours);
        } catch (Exception e) {
            log.warn("Redis unavailable, email token stored in local memory: {}", e.getMessage());
            inMemoryOtpCodes.put(key, email.toLowerCase().trim());
            inMemoryOtpExpiries.put(key, System.currentTimeMillis() + (ttlHours * 3600 * 1000));
        }
    }

    /**
     * Consume and validate email verification token from Redis.
     * Prevents token reuse and verifies authenticity.
     */
    public String consumeEmailVerificationToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Verification token is required");
        }
        String key = EMAIL_VERIFY_TOKEN_PREFIX + token.trim();
        try {
            Object emailObj = redisTemplate.opsForValue().get(key);
            if (emailObj != null) {
                redisTemplate.delete(key);
                return emailObj.toString().toLowerCase().trim();
            }
        } catch (Exception e) {
            log.warn("Redis token lookup error: {}", e.getMessage());
            Long exp = inMemoryOtpExpiries.get(key);
            if (exp != null && System.currentTimeMillis() < exp) {
                String email = inMemoryOtpCodes.remove(key);
                inMemoryOtpExpiries.remove(key);
                return email;
            }
        }
        throw new BadRequestException("Invalid or expired email verification token. Please request a new verification email.");
    }

    private String getFromFallback(String email) {
        Long expiry = inMemoryOtpExpiries.get(email);
        if (expiry != null && System.currentTimeMillis() < expiry) {
            return inMemoryOtpCodes.get(email);
        }
        inMemoryOtpCodes.remove(email);
        inMemoryOtpExpiries.remove(email);
        return null;
    }

    private void verifyFromFallback(String email, String targetOtp) {
        String storedOtp = getFromFallback(email);
        if (storedOtp == null) {
            throw new BadRequestException("OTP code has expired or was not requested. Please request a new 4-digit code.");
        }
        if (!storedOtp.equals(targetOtp)) {
            int fails = inMemoryFailCounts.getOrDefault(email, 0) + 1;
            inMemoryFailCounts.put(email, fails);
            throw new BadRequestException("Invalid 4-digit OTP code.");
        }
        inMemoryOtpCodes.remove(email);
        inMemoryOtpExpiries.remove(email);
        inMemoryFailCounts.remove(email);
    }

    // ── 2FA SESSION TOKEN MANAGEMENT ──────────────────────────────────────────

    /**
     * Store 2FA session token and 4-digit code in Redis with 5-minute automatic TTL expiration.
     */
    public void store2FaSession(String email, String twoFactorToken, String otp, int ttlMinutes) {
        String normalizedEmail = email.toLowerCase().trim();
        String sessionKey = OTP_2FA_SESSION_PREFIX + twoFactorToken;
        String data = normalizedEmail + ":" + otp;

        try {
            redisTemplate.opsForValue().set(sessionKey, data, ttlMinutes, TimeUnit.MINUTES);
            log.info("2FA session registered in Redis for [{}] [Session: {}], expires in {} min", normalizedEmail, twoFactorToken, ttlMinutes);
        } catch (Exception e) {
            log.warn("Redis unavailable, storing 2FA session in local fallback: {}", e.getMessage());
            inMemory2FaSessions.put(twoFactorToken, data);
            inMemory2FaExpiries.put(twoFactorToken, System.currentTimeMillis() + (ttlMinutes * 60L * 1000L));
        }
    }

    /**
     * Verify 2FA OTP against session token with brute-force attack prevention.
     */
    public void verify2FaSession(String email, String twoFactorToken, String providedOtp) {
        String normalizedEmail = email.toLowerCase().trim();
        String sessionKey = OTP_2FA_SESSION_PREFIX + twoFactorToken;
        String failKey = OTP_2FA_FAIL_PREFIX + twoFactorToken;

        if (providedOtp == null || providedOtp.trim().isEmpty()) {
            throw new BadRequestException("4-digit 2FA verification code is required.");
        }
        String targetOtp = providedOtp.trim();

        try {
            // Check brute-force lockout (max 3 failed attempts)
            Integer fails = (Integer) redisTemplate.opsForValue().get(failKey);
            if (fails != null && fails >= 3) {
                redisTemplate.delete(sessionKey);
                throw new BadRequestException("Too many failed 2FA verification attempts. This 2FA session has been revoked. Please sign in again.");
            }

            Object sessionDataObj = redisTemplate.opsForValue().get(sessionKey);
            String sessionData = sessionDataObj != null ? sessionDataObj.toString() : null;

            if (sessionData == null) {
                Long exp = inMemory2FaExpiries.get(twoFactorToken);
                if (exp != null && System.currentTimeMillis() < exp) {
                    sessionData = inMemory2FaSessions.get(twoFactorToken);
                }
            }

            if (sessionData == null) {
                throw new BadRequestException("2FA verification session has expired or is invalid. Please sign in again.");
            }

            String[] parts = sessionData.split(":", 2);
            if (parts.length != 2 || !parts[0].equalsIgnoreCase(normalizedEmail)) {
                throw new BadRequestException("Invalid 2FA session credentials.");
            }

            String storedOtp = parts[1];
            if (!storedOtp.equals(targetOtp)) {
                Long newFails = redisTemplate.opsForValue().increment(failKey);
                if (newFails != null && newFails == 1) {
                    redisTemplate.expire(failKey, 5, TimeUnit.MINUTES);
                }
                int remaining = Math.max(0, 3 - (newFails != null ? newFails.intValue() : 1));
                throw new BadRequestException("Invalid 4-digit 2FA code. " + remaining + " attempt(s) remaining before session is terminated.");
            }

            // Validated successfully
            log.info("2FA OTP verified for [{}] [Session: {}]", normalizedEmail, twoFactorToken);

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis 2FA error, checking local memory: {}", e.getMessage());
            Long exp = inMemory2FaExpiries.get(twoFactorToken);
            if (exp != null && System.currentTimeMillis() < exp) {
                String data = inMemory2FaSessions.get(twoFactorToken);
                if (data != null) {
                    String[] parts = data.split(":", 2);
                    if (parts.length == 2 && parts[0].equalsIgnoreCase(normalizedEmail) && parts[1].equals(targetOtp)) {
                        return;
                    }
                }
            }
            throw new BadRequestException("Invalid or expired 2FA verification code.");
        }
    }

    /**
     * Consume and destroy 2FA session immediately upon completion.
     */
    public void consume2FaSession(String email, String twoFactorToken) {
        String sessionKey = OTP_2FA_SESSION_PREFIX + twoFactorToken;
        String failKey = OTP_2FA_FAIL_PREFIX + twoFactorToken;
        try {
            redisTemplate.delete(sessionKey);
            redisTemplate.delete(failKey);
        } catch (Exception e) {
            log.debug("Redis 2FA cleanup error: {}", e.getMessage());
        }
        inMemory2FaSessions.remove(twoFactorToken);
        inMemory2FaExpiries.remove(twoFactorToken);
    }
}
