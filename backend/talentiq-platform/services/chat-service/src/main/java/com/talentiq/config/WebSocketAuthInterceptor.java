package com.talentiq.config;

import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.model.User;
import com.talentiq.repository.chat.ChatGroupMemberRepository;
import com.talentiq.repository.chat.ChatGroupRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.security.jwt.JwtService;
import com.talentiq.security.jwt.TokenBlacklistService;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.company.CompanySecurityService;
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

import java.util.List;

/**
 * Intercepts STOMP CONNECT frames to authenticate WebSocket connections via JWT.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserRepository userRepository;
    private final ChatGroupMemberRepository groupMemberRepository;
    private final ChatGroupRepository groupRepository;
    private final CompanySecurityService companySecurityService;

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
            try {
                if (!(accessor.getUser() instanceof UsernamePasswordAuthenticationToken authentication)
                        || !(authentication.getDetails() instanceof String email)) return null;
                Long userId = Long.valueOf(authentication.getName());
                User user = userRepository.findById(userId).orElse(null);
                if (user == null || user.getStatus() != UserStatus.ACTIVE) return null;
                Long groupId = Long.valueOf(destination.substring(destination.lastIndexOf('.') + 1));
                if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) return null;
            } catch (Exception denied) {
                log.warn("WebSocket group destination denied: {}", denied.getMessage());
                return null;
            }
        }
        return message;
    }
}
