package com.talentiq.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class JwtAuthenticationGatewayFilterTest {

    private JwtAuthenticationGatewayFilter filter;
    private final String testSecret = "talentiq-test-secret-key-that-is-at-least-256-bits-long-for-testing-purposes-123456";

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationGatewayFilter();
        ReflectionTestUtils.setField(filter, "jwtSecret", testSecret);
        filter.init();
    }

    @Test
    void shouldExtractClaimsAndAddHeadersForValidToken() {
        SecretKey key = Keys.hmacShaKeyFor(testSecret.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject("candidate@gmail.com")
                .claim("userId", 42L)
                .claim("roles", List.of("ROLE_CANDIDATE"))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60000))
                .signWith(key)
                .compact();

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/jobs")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<String> passedEmail = new AtomicReference<>();
        AtomicReference<String> passedUserId = new AtomicReference<>();
        AtomicReference<String> passedRoles = new AtomicReference<>();

        GatewayFilterChain chain = mutatedExchange -> {
            passedEmail.set(mutatedExchange.getRequest().getHeaders().getFirst(JwtAuthenticationGatewayFilter.HEADER_USER_EMAIL));
            passedUserId.set(mutatedExchange.getRequest().getHeaders().getFirst(JwtAuthenticationGatewayFilter.HEADER_USER_ID));
            passedRoles.set(mutatedExchange.getRequest().getHeaders().getFirst(JwtAuthenticationGatewayFilter.HEADER_ROLES));
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertEquals("candidate@gmail.com", passedEmail.get());
        assertEquals("42", passedUserId.get());
        assertEquals("ROLE_CANDIDATE", passedRoles.get());
    }

    @Test
    void shouldPassThroughWhenNoAuthorizationHeader() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/jobs").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<String> passedEmail = new AtomicReference<>();
        GatewayFilterChain chain = mutatedExchange -> {
            passedEmail.set(mutatedExchange.getRequest().getHeaders().getFirst(JwtAuthenticationGatewayFilter.HEADER_USER_EMAIL));
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertNull(passedEmail.get());
    }

    @Test
    void shouldParseMonolithToken() {
        JwtAuthenticationGatewayFilter prodFilter = new JwtAuthenticationGatewayFilter();
        ReflectionTestUtils.setField(prodFilter, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        prodFilter.init();

        String token = "eyJhbGciOiJIUzUxMiJ9.eyJyb2xlcyI6WyJST0xFX0NBTkRJREFURSJdLCJ0eXBlIjoiQUNDRVNTIiwidXNlcklkIjoyLCJzdWIiOiJ5b21lMTAxMTAxMTEwMUBnbWFpbC5jb20iLCJpYXQiOjE3ODk0NTM1MTYsImV4cCI6MTc4OTQ1NDQxNn0.46W-fgCpMdjYzzB364e5Uy45Sh1UgWBA274vaWxVlfDBwKnmKjiSkTNI_VDJgkfaFuZg_J7CvcOCOszL31zUag";
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/subscriptions/purchase")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<String> passedEmail = new AtomicReference<>();
        AtomicReference<String> passedUserId = new AtomicReference<>();
        AtomicReference<String> passedRoles = new AtomicReference<>();

        GatewayFilterChain chain = mutatedExchange -> {
            passedEmail.set(mutatedExchange.getRequest().getHeaders().getFirst(JwtAuthenticationGatewayFilter.HEADER_USER_EMAIL));
            passedUserId.set(mutatedExchange.getRequest().getHeaders().getFirst(JwtAuthenticationGatewayFilter.HEADER_USER_ID));
            passedRoles.set(mutatedExchange.getRequest().getHeaders().getFirst(JwtAuthenticationGatewayFilter.HEADER_ROLES));
            return Mono.empty();
        };

        prodFilter.filter(exchange, chain).block();

        assertEquals("yome1011011101@gmail.com", passedEmail.get());
        assertEquals("2", passedUserId.get());
        assertEquals("ROLE_CANDIDATE", passedRoles.get());
    }
}
