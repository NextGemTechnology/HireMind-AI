package com.talentiq.security.jwt;

import com.talentiq.common.enums.Role;
import com.talentiq.model.User;
import com.talentiq.security.userdetails.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for JwtService.
 * Tests token generation, validation, and claims extraction.
 */
@DisplayName("JwtService Unit Tests")
class JwtServiceTest {

    private JwtService jwtService;

    private static final String TEST_SECRET =
            "dGVzdC1zZWNyZXQta2V5LWZvci11bml0LXRlc3RpbmctbG9uZy1lbm91Z2gtMjU2LWJpdHM=";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiryMs", 900_000L);
    }

    private UserPrincipal createTestPrincipal(String email) {
        User user = User.builder()
                .id(42L)
                .email(email)
                .firstName("Test")
                .lastName("User")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .build();
        return new UserPrincipal(user);
    }

    @Test
    @DisplayName("should generate a non-null access token")
    void shouldGenerateNonNullAccessToken() {
        UserPrincipal principal = createTestPrincipal("test@example.com");
        String token = jwtService.generateAccessToken(principal, 42L);
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    @DisplayName("should extract correct subject from token")
    void shouldExtractCorrectSubject() {
        UserPrincipal principal = createTestPrincipal("user@example.com");
        String token = jwtService.generateAccessToken(principal, 1L);
        assertThat(jwtService.extractSubject(token)).isEqualTo("user@example.com");
    }

    @Test
    @DisplayName("should extract correct userId from token")
    void shouldExtractCorrectUserId() {
        UserPrincipal principal = createTestPrincipal("user@example.com");
        String token = jwtService.generateAccessToken(principal, 99L);
        assertThat(jwtService.extractUserId(token)).isEqualTo(99L);
    }

    @Test
    @DisplayName("should extract roles from token")
    void shouldExtractRolesFromToken() {
        UserPrincipal principal = createTestPrincipal("user@example.com");
        String token = jwtService.generateAccessToken(principal, 1L);
        assertThat(jwtService.extractRoles(token)).contains("ROLE_CANDIDATE");
    }

    @Test
    @DisplayName("should validate a valid token")
    void shouldValidateValidToken() {
        UserPrincipal principal = createTestPrincipal("user@example.com");
        String token = jwtService.generateAccessToken(principal, 1L);
        assertThat(jwtService.isTokenValid(token, principal)).isTrue();
    }

    @Test
    @DisplayName("should reject token for different user")
    void shouldRejectTokenForDifferentUser() {
        UserPrincipal ownerPrincipal = createTestPrincipal("owner@example.com");
        UserPrincipal otherPrincipal = createTestPrincipal("other@example.com");
        String token = jwtService.generateAccessToken(ownerPrincipal, 1L);
        assertThat(jwtService.isTokenValid(token, otherPrincipal)).isFalse();
    }

    @Test
    @DisplayName("should detect expired token")
    void shouldDetectExpiredToken() throws InterruptedException {
        JwtService shortLivedService = new JwtService();
        ReflectionTestUtils.setField(shortLivedService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(shortLivedService, "accessTokenExpiryMs", 1L); // 1ms

        UserPrincipal principal = createTestPrincipal("user@example.com");
        String token = shortLivedService.generateAccessToken(principal, 1L);

        Thread.sleep(10); // Wait for token to expire

        assertThat(shortLivedService.isTokenExpired(token)).isTrue();
    }
}
