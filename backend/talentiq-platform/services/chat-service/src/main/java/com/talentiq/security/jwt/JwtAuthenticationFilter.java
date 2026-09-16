package com.talentiq.security.jwt;

import com.talentiq.common.constants.AppConstants;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter.
 * Runs once per request, extracts the Bearer token from the Authorization header,
 * validates it, and populates the SecurityContext.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader(AppConstants.AUTH_HEADER);
        String jwt = null;

        if (StringUtils.hasText(authHeader) && authHeader.startsWith(AppConstants.TOKEN_PREFIX)) {
            jwt = authHeader.substring(AppConstants.TOKEN_PREFIX.length());
        } else {
            // For SSE / WebSockets where headers might not be easily passed
            String tokenParam = request.getParameter("token");
            if (StringUtils.hasText(tokenParam)) {
                jwt = tokenParam;
            }
        }

        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // Instant token destruction / blacklist check
        if (tokenBlacklistService.isBlacklisted(jwt)) {
            log.warn("Access attempt with revoked/blacklisted token for URI: {}", request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Session terminated / token has been destroyed. Please log in again.\"}");
            return;
        }

        try {
            final String userEmail = jwtService.extractSubject(jwt);

            if (StringUtils.hasText(userEmail)
                    && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Invalid token — don't populate context, let Spring Security handle it
            log.debug("JWT authentication failed for request [{}]: {}", request.getRequestURI(), e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/v1/auth/login")
                || path.startsWith("/v1/auth/register")
                || path.startsWith("/v1/auth/google")
                || path.startsWith("/v1/auth/refresh")
                || path.startsWith("/v1/auth/verify-email")
                || path.startsWith("/v1/auth/forgot-password")
                || path.startsWith("/v1/auth/reset-password")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/api-docs")
                || path.startsWith("/actuator/health");
    }
}
