package com.talentiq.config;

import com.talentiq.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

/**
 * Intercepts STOMP CONNECT frames to authenticate WebSocket connections via JWT.
 *
 * The frontend sends: connectHeaders: { Authorization: "Bearer <jwt>" }
 * This interceptor extracts the token, validates it using JwtService,
 * and sets an authenticated Principal (userId as name) on the session.
 *
 * Without this interceptor, headerAccessor.getUser() returns null in
 * all @MessageMapping handlers, causing messages to be silently dropped.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final com.talentiq.security.jwt.TokenBlacklistService tokenBlacklistService;
    private final com.talentiq.security.userdetails.CustomUserDetailsService userDetailsService;
    private final com.talentiq.repository.chat.ChatGroupMemberRepository groupMemberRepository;
    private final com.talentiq.repository.chat.ChatGroupRepository groupRepository;
    private final com.talentiq.service.company.CompanySecurityService companySecurityService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand()) || StompCommand.SEND.equals(accessor.getCommand()) || StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    if (tokenBlacklistService.isBlacklisted(token)) {
                        log.warn("WebSocket STOMP: Token is revoked / blacklisted");
                        return null; // Reject connection
                    }

                    Long userId = jwtService.extractUserId(token);
                    String subject = jwtService.extractSubject(token);

                    if (userId != null && subject != null && !jwtService.isTokenExpired(token)) {
                        UsernamePasswordAuthenticationToken principal = new UsernamePasswordAuthenticationToken(
                                userId.toString(), null, List.of()
                        );
                        principal.setDetails(subject);
                        accessor.setUser(principal);
                        log.debug("WebSocket STOMP authenticated for userId={}, email={}", userId, subject);
                    } else {
                        log.warn("WebSocket STOMP: JWT invalid or expired for subject={}", subject);
                    }
                } catch (Exception e) {
                    log.warn("WebSocket STOMP: JWT parsing failed: {}", e.getMessage());
                }
            } else if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                log.warn("WebSocket STOMP CONNECT: No Authorization header found");
            }
        }

        String destination = accessor.getDestination();
        boolean groupSubscription = StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                && destination != null && destination.startsWith("/topic/group.");
        boolean groupSend = StompCommand.SEND.equals(accessor.getCommand())
                && destination != null && destination.startsWith("/app/group.chat.send.");
        if (groupSubscription || groupSend) {
            // REST membership checks do not protect direct STOMP subscriptions.
            // Re-check the persisted identity and manager tenant at this separate entry point.
            try {
                if (!(accessor.getUser() instanceof UsernamePasswordAuthenticationToken authentication)
                        || !(authentication.getDetails() instanceof String email)) return null;
                var details = userDetailsService.loadUserByUsername(email);
                if (!(details instanceof com.talentiq.security.userdetails.UserPrincipal principal)
                        || !principal.isEnabled() || !principal.isAccountNonLocked()
                        || !principal.getId().toString().equals(authentication.getName())) return null;
                Long groupId = Long.valueOf(destination.substring(destination.lastIndexOf('.') + 1));
                if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, principal.getId())) return null;
                if (principal.hasRole(com.talentiq.common.enums.Role.ROLE_COMPANY_ADMIN)) {
                    var company = companySecurityService.resolveManagerCompany(principal);
                    var group = groupRepository.findById(groupId).orElse(null);
                    if (group == null || !group.isActive()
                            || (group.getCompanyId() != null && !company.getId().equals(group.getCompanyId()))) return null;
                }
            } catch (Exception denied) {
                log.warn("WebSocket group destination denied");
                return null;
            }
        }
        return message;
    }
}
