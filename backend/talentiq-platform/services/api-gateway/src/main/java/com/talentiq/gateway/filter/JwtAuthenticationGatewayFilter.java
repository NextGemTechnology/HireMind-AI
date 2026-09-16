package com.talentiq.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;

@Component
@Slf4j
public class JwtAuthenticationGatewayFilter implements GlobalFilter, Ordered {

    public static final String HEADER_USER_ID = "X-Auth-User-Id";
    public static final String HEADER_USER_EMAIL = "X-Auth-User-Email";
    public static final String HEADER_ROLES = "X-Auth-Roles";
    public static final String HEADER_COMPANY_ID = "X-Auth-Company-Id";

    @Value("${app.jwt.secret:talentiq-super-secret-key-change-in-production-must-be-at-least-256-bits}")
    private String jwtSecret;

    private SecretKey signingKey;

    @PostConstruct
    public void init() {
        byte[] keyBytes = Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(jwtSecret.getBytes())
        );
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(signingKey)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                if (claims.getExpiration() == null || claims.getExpiration().after(new Date())) {
                    ServerHttpRequest.Builder reqBuilder = exchange.getRequest().mutate();

                    String email = claims.getSubject();
                    if (StringUtils.hasText(email)) {
                        reqBuilder.header(HEADER_USER_EMAIL, email);
                    }

                    Object userIdObj = claims.get("userId");
                    if (userIdObj != null) {
                        reqBuilder.header(HEADER_USER_ID, String.valueOf(userIdObj));
                    }

                    Object companyIdObj = claims.get("companyId");
                    if (companyIdObj != null) {
                        reqBuilder.header(HEADER_COMPANY_ID, String.valueOf(companyIdObj));
                    }

                    Object rolesObj = claims.get("roles");
                    if (rolesObj instanceof List<?> rolesList) {
                        String rolesCsv = String.join(",", rolesList.stream().map(Object::toString).toList());
                        reqBuilder.header(HEADER_ROLES, rolesCsv);
                    }

                    return chain.filter(exchange.mutate().request(reqBuilder.build()).build());
                }
            } catch (JwtException e) {
                log.debug("Gateway JWT validation error: {}", e.getMessage());
            } catch (Exception e) {
                log.warn("Failed to process JWT in gateway: {}", e.getMessage());
            }
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
