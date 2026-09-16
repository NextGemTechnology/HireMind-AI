package com.talentiq.security.filter;

import com.talentiq.security.constants.SecurityConstants;
import com.talentiq.security.userdetails.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Filter that populates Spring Security context for downstream microservices
 * from trusted gateway headers (X-Auth-User-Id, X-Auth-User-Email, X-Auth-Roles).
 */
@Slf4j
public class HeaderAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String email = request.getHeader(SecurityConstants.HEADER_USER_EMAIL);
        String userIdStr = request.getHeader(SecurityConstants.HEADER_USER_ID);
        String rolesStr = request.getHeader(SecurityConstants.HEADER_ROLES);
        String companyIdStr = request.getHeader(SecurityConstants.HEADER_COMPANY_ID);

        if (StringUtils.isNotBlank(email) && SecurityContextHolder.getContext().getAuthentication() == null) {
            Long userId = null;
            if (StringUtils.isNumeric(userIdStr)) {
                try {
                    userId = Long.parseLong(userIdStr);
                } catch (NumberFormatException ignored) {}
            }

            Long companyId = null;
            if (StringUtils.isNumeric(companyIdStr)) {
                try {
                    companyId = Long.parseLong(companyIdStr);
                } catch (NumberFormatException ignored) {}
            }

            List<String> roles = Collections.emptyList();
            if (StringUtils.isNotBlank(rolesStr)) {
                roles = Arrays.stream(rolesStr.split(","))
                        .map(String::trim)
                        .filter(StringUtils::isNotBlank)
                        .toList();
            }

            UserPrincipal principal = UserPrincipal.builder()
                    .userId(userId)
                    .email(email)
                    .companyId(companyId)
                    .roles(roles)
                    .build();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Authenticated user {} via gateway headers with roles {}", email, roles);
        }

        filterChain.doFilter(request, response);
    }
}
