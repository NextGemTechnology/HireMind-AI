package com.talentiq.config;

import com.talentiq.infrastructure.ratelimit.RateLimitFilter;
import com.talentiq.security.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration.
 * Stateless JWT-based auth.
 * Method-level security enabled via @PreAuthorize / @PostAuthorize.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final RateLimitFilter rateLimitFilter;
    private final com.talentiq.security.DeveloperGuardFilter developerGuardFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    // ── Public endpoints ──────────────────────────────────────────────────────
    private static final String[] PUBLIC_ENDPOINTS = {
            "/v1/auth/**",
            "/v1/jobs",
            "/v1/jobs/{id}",
            "/v1/p/**",              // Public portfolio
            "/v1/companies/*/public",
            "/swagger-ui/**",
            "/api-docs/**",
            "/actuator/health",
            "/v1/public/**",
            "/v1/analytics/public/**",
            "/v1/analytics/public-stats",
            // WebSocket SockJS handshake endpoints
            "/ws/**",
            "/ws/info/**",
            // Public candidate verification certificate endpoints
            "/v1/company/verifications/candidate/**",
            "/v1/company/verifications/certificate/**",
            "/v1/company/invitations/validate/**",
            // Public user avatar endpoints (Instagram style)
            "/v1/users/avatar/**",
            // Public subscription pricing plans and gateway webhooks
            "/v1/subscriptions/plans",
            "/v1/subscriptions/plans/**",
            "/v1/subscriptions/webhook/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // ── Disable CSRF (stateless JWT, no sessions) ─────────────────
                .csrf(AbstractHttpConfigurer::disable)

                // ── CORS ──────────────────────────────────────────────────────
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── Session — stateless ───────────────────────────────────────
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // ── Authorization rules ───────────────────────────────────────
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .requestMatchers("/v1/admin/developer/**").hasAnyRole("APP_DEVELOPER", "SUPER_ADMIN", "PLATFORM_ADMIN")
                        .requestMatchers("/v1/admin/service/**").hasAnyRole("SERVICE_TEAM", "SUPER_ADMIN", "PLATFORM_ADMIN")
                        .requestMatchers("/v1/admin/company/**").hasAnyRole("COMPANY_ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN")
                        .requestMatchers("/v1/admin/super/**").hasAnyRole("SUPER_ADMIN", "PLATFORM_ADMIN")
                        .requestMatchers("/v1/admin/**").hasAnyRole("PLATFORM_ADMIN", "SUPER_ADMIN", "SERVICE_TEAM", "APP_DEVELOPER", "COMPANY_ADMIN")
                        .requestMatchers("/v1/employees/**").authenticated()
                        .requestMatchers("/v1/salary/**").authenticated()
                        .anyRequest().authenticated()
                )

                // ── Exception Handling (401 on unauthenticated / expired JWT) ─
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"success\":false,\"message\":\"Session expired or unauthorized. Please log in.\",\"errorCode\":\"UNAUTHORIZED\"}");
                        })
                )

                // ── Security headers ──────────────────────────────────────────
                .headers(headers -> headers
                        .contentSecurityPolicy(csp ->
                                csp.policyDirectives("default-src 'self'; frame-ancestors 'none';"))
                        .referrerPolicy(referrer ->
                                referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN))
                        .frameOptions(frame -> frame.deny())
                        .xssProtection(xss -> xss.disable()) // Handled by CSP
                )

                // ── Auth provider + JWT filter ─────────────────────────────────
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(developerGuardFilter, JwtAuthenticationFilter.class)

                .build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
