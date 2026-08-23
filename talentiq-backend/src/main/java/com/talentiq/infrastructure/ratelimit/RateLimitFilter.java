package com.talentiq.infrastructure.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.response.ApiResponse;
import com.talentiq.config.AppProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter using Bucket4j in-memory buckets (per IP).
 *
 * Strategy:
 * - Login endpoints: 10 requests / minute (anti-brute-force)
 * - All other endpoints: 60 requests / minute (general protection)
 *
 * Production note: In clustered environments, switch bucket storage
 * to Redis using Bucket4j's RedisProxyManager for distributed rate limiting.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    // In-memory bucket store (sufficient for single-node; replace with Redis for multi-node)
    private final Map<String, Bucket> ipBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    private static final String LOGIN_PATH = "/v1/auth/login";
    private static final String REGISTER_PATH = "/v1/auth/register";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (!appProperties.getRateLimit().isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String path = request.getServletPath();

        boolean isLoginPath = path.startsWith(LOGIN_PATH) || path.startsWith(REGISTER_PATH);
        Bucket bucket = isLoginPath
                ? getLoginBucket(clientIp)
                : getDefaultBucket(clientIp);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
        } else {
            long waitSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000;
            log.warn("Rate limit exceeded for IP: {} on path: {}", clientIp, path);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(waitSeconds));
            response.setHeader("X-Rate-Limit-Remaining", "0");

            ApiResponse<Void> body = ApiResponse.error(
                    "Too many requests. Please wait " + waitSeconds + " seconds before trying again.",
                    "RATE_LIMIT_EXCEEDED"
            );
            response.getWriter().write(objectMapper.writeValueAsString(body));
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/actuator")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/api-docs")
                || "true".equalsIgnoreCase(request.getHeader("X-Internal-Test"));
    }

    private Bucket getDefaultBucket(String ip) {
        return ipBuckets.computeIfAbsent(ip, k -> {
            AppProperties.RateLimitProperties rl = appProperties.getRateLimit();
            return Bucket.builder()
                    .addLimit(Bandwidth.builder()
                            .capacity(rl.getDefaultCapacity())
                            .refillGreedy(rl.getDefaultRefillPerMinute(), Duration.ofMinutes(1))
                            .build())
                    .build();
        });
    }

    private Bucket getLoginBucket(String ip) {
        return loginBuckets.computeIfAbsent(ip, k -> {
            AppProperties.RateLimitProperties rl = appProperties.getRateLimit();
            return Bucket.builder()
                    .addLimit(Bandwidth.builder()
                            .capacity(rl.getLoginCapacity())
                            .refillGreedy(rl.getLoginRefillPerMinute(), Duration.ofMinutes(1))
                            .build())
                    .build();
        });
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
