package com.talentiq.service.auth;

import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.UnauthorizedException;
import com.talentiq.config.AppProperties;
import com.talentiq.dto.auth.*;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.model.RefreshToken;
import com.talentiq.model.User;
import com.talentiq.model.auth.UserCredential;
import com.talentiq.repository.auth.*;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.security.jwt.JwtService;
import com.talentiq.security.jwt.TokenBlacklistService;
import com.talentiq.security.userdetails.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthServiceImpl with separated credential architecture.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AuthService Unit Tests")
class AuthServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private MailService mailService;
    @Mock private AppProperties appProperties;
    @Mock private TokenBlacklistService tokenBlacklistService;
    @Mock private RedisOtpService redisOtpService;
    @Mock private HttpServletRequest httpRequest;
    @Mock private com.talentiq.security.email.EmailSecurityValidator emailSecurityValidator;
    @Mock private UserCredentialRepository userCredentialRepository;
    @Mock private HrCredentialRepository hrCredentialRepository;
    @Mock private CompanyCredentialRepository companyCredentialRepository;
    @Mock private AppDevCredentialRepository appDevCredentialRepository;
    @Mock private ManagementTeamCredentialRepository managementTeamCredentialRepository;

    @InjectMocks
    private AuthServiceImpl authService;

    private AppProperties.JwtProperties jwtProps;
    private AppProperties.MailProperties mailProps;
    private AppProperties.FrontendProperties frontendProps;

    @BeforeEach
    void setUp() {
        jwtProps = new AppProperties.JwtProperties();
        jwtProps.setSecret("test-secret");
        jwtProps.setAccessTokenExpiryMs(900_000L);
        jwtProps.setRefreshTokenExpiryDays(7);

        mailProps = new AppProperties.MailProperties();
        mailProps.setVerificationExpiryMinutes(30);
        mailProps.setResetPasswordExpiryMinutes(15);

        frontendProps = new AppProperties.FrontendProperties();
        frontendProps.setBaseUrl("http://localhost:3000");

        when(appProperties.getJwt()).thenReturn(jwtProps);
        when(appProperties.getMail()).thenReturn(mailProps);
        when(appProperties.getFrontend()).thenReturn(frontendProps);
    }

    // ── Register Tests ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Register")
    class RegisterTests {

        @Test
        @DisplayName("should register a candidate successfully with OTP verification and create separated credentials")
        void shouldRegisterCandidateSuccessfully() {
            RegisterRequest request = new RegisterRequest();
            request.setEmail("john@example.com");
            request.setPassword("Password@123");
            request.setFirstName("John");
            request.setLastName("Doe");
            request.setRole(Role.ROLE_CANDIDATE);
            request.setOtp("1234");

            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userCredentialRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode("Password@123")).thenReturn("$2a$10$hashedPassword");

            User savedUser = User.builder()
                    .id(1L)
                    .email("john@example.com")
                    .firstName("John")
                    .lastName("Doe")
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .roles(Set.of(Role.ROLE_CANDIDATE))
                    .build();

            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(jwtService.generateAccessToken(any(), eq(1L))).thenReturn("access-token-xyz");

            RefreshToken refreshToken = RefreshToken.builder()
                    .id(1L)
                    .token("refresh-token-xyz")
                    .user(savedUser)
                    .expiresAt(Instant.now().plusSeconds(604800))
                    .build();
            when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(refreshToken);

            AuthResponse response = authService.register(request, httpRequest);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("access-token-xyz");
            assertThat(response.getRefreshToken()).isEqualTo("refresh-token-xyz");
            assertThat(response.getEmail()).isEqualTo("john@example.com");

            verify(redisOtpService).verifyRegistrationOtp("john@example.com", "1234");
            verify(userCredentialRepository).save(any(UserCredential.class));
            verify(candidateRepository).save(any());
        }

        @Test
        @DisplayName("should throw ConflictException when email already exists")
        void shouldThrowConflictWhenEmailExists() {
            RegisterRequest request = new RegisterRequest();
            request.setEmail("existing@example.com");
            request.setPassword("Password@123");
            request.setFirstName("Jane");
            request.setLastName("Doe");
            request.setRole(Role.ROLE_CANDIDATE);
            request.setOtp("1234");

            when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

            assertThatThrownBy(() -> authService.register(request, httpRequest))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("already exists");

            verify(userRepository, never()).save(any());
            verify(userCredentialRepository, never()).save(any());
        }
    }

    // ── Login Tests ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Login")
    class LoginTests {

        @Test
        @DisplayName("should login candidate successfully via UserCredential")
        void shouldLoginSuccessfully() {
            LoginRequest request = new LoginRequest();
            request.setEmail("john@example.com");
            request.setPassword("Password@123");

            User user = User.builder()
                    .id(1L)
                    .email("john@example.com")
                    .firstName("John")
                    .lastName("Doe")
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .roles(Set.of(Role.ROLE_CANDIDATE))
                    .build();

            UserCredential cred = UserCredential.builder()
                    .id(10L)
                    .user(user)
                    .email("john@example.com")
                    .passwordHash("$2a$10$hashedPassword")
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .build();

            when(userCredentialRepository.findByEmail("john@example.com")).thenReturn(Optional.of(cred));
            when(passwordEncoder.matches("Password@123", "$2a$10$hashedPassword")).thenReturn(true);
            when(jwtService.generateAccessToken(any(), eq(1L))).thenReturn("access-token-xyz");

            RefreshToken refreshToken = RefreshToken.builder()
                    .id(1L)
                    .token("refresh-token-xyz")
                    .user(user)
                    .expiresAt(Instant.now().plusSeconds(604800))
                    .build();
            when(refreshTokenRepository.save(any())).thenReturn(refreshToken);

            AuthResponse response = authService.login(request, httpRequest);

            assertThat(response.getAccessToken()).isEqualTo("access-token-xyz");
            assertThat(response.getRefreshToken()).isEqualTo("refresh-token-xyz");
            assertThat(response.getEmail()).isEqualTo("john@example.com");

            verify(userCredentialRepository).recordSuccessfulLogin(eq(10L), any(Instant.class));
        }

        @Test
        @DisplayName("should throw UnauthorizedException for locked account")
        void shouldThrowForLockedAccount() {
            LoginRequest request = new LoginRequest();
            request.setEmail("locked@example.com");
            request.setPassword("any");

            User user = User.builder().id(2L).email("locked@example.com").build();
            UserCredential cred = UserCredential.builder()
                    .id(20L)
                    .user(user)
                    .email("locked@example.com")
                    .passwordHash("$hash$")
                    .lockedUntil(Instant.now().plusSeconds(600))
                    .build();

            when(userCredentialRepository.findByEmail("locked@example.com")).thenReturn(Optional.of(cred));

            assertThatThrownBy(() -> authService.login(request, httpRequest))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("locked");
        }

        @Test
        @DisplayName("should increment failed attempts on bad password")
        void shouldIncrementFailedAttemptsOnBadPassword() {
            LoginRequest request = new LoginRequest();
            request.setEmail("user@example.com");
            request.setPassword("wrong");

            User user = User.builder().id(3L).email("user@example.com").build();
            UserCredential cred = UserCredential.builder()
                    .id(30L)
                    .user(user)
                    .email("user@example.com")
                    .passwordHash("$hash$")
                    .loginAttempts(2)
                    .build();

            when(userCredentialRepository.findByEmail("user@example.com")).thenReturn(Optional.of(cred));
            when(passwordEncoder.matches("wrong", "$hash$")).thenReturn(false);

            assertThatThrownBy(() -> authService.login(request, httpRequest))
                    .isInstanceOf(BadCredentialsException.class)
                    .hasMessageContaining("1 attempt remaining");

            verify(userCredentialRepository).incrementLoginAttempts(30L);
        }
    }

    // ── Refresh Token Tests ───────────────────────────────────────────────────

    @Nested
    @DisplayName("Refresh Token")
    class RefreshTokenTests {

        @Test
        @DisplayName("should rotate refresh token successfully")
        void shouldRotateRefreshTokenSuccessfully() {
            RefreshTokenRequest request = new RefreshTokenRequest();
            request.setRefreshToken("valid-refresh-token");

            User user = User.builder()
                    .id(1L)
                    .email("user@example.com")
                    .firstName("Jane")
                    .lastName("Doe")
                    .roles(Set.of(Role.ROLE_CANDIDATE))
                    .build();

            RefreshToken oldToken = RefreshToken.builder()
                    .id(1L)
                    .token("valid-refresh-token")
                    .user(user)
                    .expiresAt(Instant.now().plusSeconds(3600))
                    .revoked(false)
                    .build();

            RefreshToken newToken = RefreshToken.builder()
                    .id(2L)
                    .token("new-refresh-token")
                    .user(user)
                    .expiresAt(Instant.now().plusSeconds(604800))
                    .revoked(false)
                    .build();

            when(refreshTokenRepository.findByToken("valid-refresh-token")).thenReturn(Optional.of(oldToken));
            when(refreshTokenRepository.save(any())).thenReturn(newToken);
            when(jwtService.generateAccessToken(any(), eq(1L))).thenReturn("new-access-token");

            AuthResponse response = authService.refreshToken(request, httpRequest);

            assertThat(response.getAccessToken()).isEqualTo("new-access-token");
            assertThat(oldToken.isRevoked()).isTrue();
        }
    }

    // ── Password Reset Tests ──────────────────────────────────────────────────

    @Nested
    @DisplayName("Password Reset")
    class PasswordResetTests {

        @Test
        @DisplayName("forgotPassword should throw BadRequestException when email does not exist")
        void forgotPasswordShouldThrowWhenEmailNotFound() {
            ForgotPasswordRequest request = new ForgotPasswordRequest();
            request.setEmail("nonexistent@example.com");

            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.forgotPassword(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("No registered account found");
        }

        @Test
        @DisplayName("should reset password and update credentials table")
        void shouldResetPasswordSuccessfully() {
            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setEmail("user@example.com");
            request.setOtp("1234");
            request.setNewPassword("NewSecure@456");

            User user = User.builder().id(1L).email("user@example.com").build();
            UserCredential cred = UserCredential.builder().id(10L).user(user).email("user@example.com").build();

            when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
            when(userCredentialRepository.findByEmail("user@example.com")).thenReturn(Optional.of(cred));
            when(redisOtpService.isOtpVerified("user@example.com")).thenReturn(true);
            when(passwordEncoder.encode("NewSecure@456")).thenReturn("$new-hash$");

            authService.resetPassword(request);

            verify(userCredentialRepository).updatePassword(10L, "$new-hash$");
            verify(refreshTokenRepository).revokeAllUserTokens(1L);
        }
    }
}
