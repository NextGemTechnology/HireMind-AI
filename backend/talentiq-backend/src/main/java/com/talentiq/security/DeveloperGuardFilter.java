package com.talentiq.security;

import com.talentiq.common.enums.Role;
import com.talentiq.security.userdetails.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Security filter enforcing architectural restrictions on Application Developers:
 * Prevents execution of destructive schema / database wipe commands while allowing full application management.
 */
@Component
@Slf4j
public class DeveloperGuardFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
            boolean isDeveloper = principal.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals(Role.ROLE_APP_DEVELOPER.name()));

            if (isDeveloper) {
                String path = request.getRequestURI().toLowerCase();
                String method = request.getMethod().toUpperCase();

                // Block any destructive database purge / wipe endpoints
                if ((path.contains("/db/drop") || path.contains("/db/truncate") || path.contains("/db/purge-all"))
                        || (method.equals("DELETE") && path.equals("/api/v1/admin/database/all"))) {
                    log.warn("BLOCKED destructive database purge attempt by Developer user ID: {}", principal.getId());
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Developer Security Policy: Application Developers are structurally restricted from dropping or wiping the database schema or entire dataset.\",\"errorCode\":\"RESTRICTED_DEVELOPER_ACTION\"}");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
