package com.talentiq.controller.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentiq.common.enums.Role;
import com.talentiq.dto.auth.*;
import com.talentiq.service.auth.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller slice test for AuthController.
 * Uses @WebMvcTest to test only the web layer (no DB, no real service).
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthController Integration Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private com.talentiq.security.jwt.JwtService jwtService;

    @MockBean
    private com.talentiq.security.userdetails.CustomUserDetailsService customUserDetailsService;

    @MockBean
    private com.talentiq.infrastructure.ratelimit.RateLimitFilter rateLimitFilter;

    @MockBean
    private com.talentiq.security.jwt.JwtAuthenticationFilter jwtAuthenticationFilter;

    // ── Register Tests ────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /v1/auth/register - should return 201 on valid request")
    void shouldReturn201OnValidRegistration() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("john@gmail.com");
        request.setPassword("Secure@123");
        request.setRole(Role.ROLE_CANDIDATE);
        request.setOtp("1234");

        AuthResponse mockResponse = AuthResponse.builder()
                .userId(1L)
                .email("john@gmail.com")
                .firstName("John")
                .lastName("Doe")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .emailVerified(false)
                .build();

        when(authService.register(any(), any())).thenReturn(mockResponse);

        mockMvc.perform(post("/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("john@gmail.com"))
                .andExpect(jsonPath("$.data.emailVerified").value(false));
    }

    @Test
    @DisplayName("POST /v1/auth/register - should return 400 on invalid email")
    void shouldReturn400OnInvalidEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("not-an-email");
        request.setPassword("Secure@123");
        request.setRole(Role.ROLE_CANDIDATE);
        request.setOtp("1234");

        mockMvc.perform(post("/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.data.email").exists());
    }

    @Test
    @DisplayName("POST /v1/auth/register - should return 400 on non-gmail / disposable email")
    void shouldReturn400OnDisposableEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("hacker@temp-mail.org");
        request.setPassword("Secure@123");
        request.setRole(Role.ROLE_CANDIDATE);
        request.setOtp("1234");

        mockMvc.perform(post("/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("POST /v1/auth/register - should return 400 on weak password")
    void shouldReturn400OnWeakPassword() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("john@gmail.com");
        request.setPassword("weak");       // Too short, no special chars
        request.setRole(Role.ROLE_CANDIDATE);
        request.setOtp("1234");

        mockMvc.perform(post("/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    // ── Login Tests ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /v1/auth/login - should return 200 with tokens")
    void shouldReturn200WithTokensOnValidLogin() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@gmail.com");
        request.setPassword("Secure@123");

        AuthResponse mockResponse = AuthResponse.builder()
                .accessToken("access.token.here")
                .refreshToken("refresh-uuid")
                .tokenType("Bearer")
                .expiresIn(900L)
                .userId(1L)
                .email("john@gmail.com")
                .emailVerified(true)
                .build();

        when(authService.login(any(), any())).thenReturn(mockResponse);

        mockMvc.perform(post("/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access.token.here"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(900));
    }

    @Test
    @DisplayName("POST /v1/auth/login - should return 400 on missing fields")
    void shouldReturn400OnMissingLoginFields() throws Exception {
        mockMvc.perform(post("/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    // ── Logout Tests ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /v1/auth/logout - should return 200 for authenticated user")
    @WithMockUser(username = "john@gmail.com", roles = "CANDIDATE")
    void shouldReturn200OnLogout() throws Exception {
        mockMvc.perform(post("/v1/auth/logout")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
