package com.talentiq.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for real-time notifications and HR Copilot streaming.
 *
 * Client connects to: ws://host/ws (with SockJS fallback)
 * Subscribe to: /user/queue/notifications
 * Subscribe to: /topic/copilot/{sessionId}
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable simple in-memory broker for topics and queues
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages routed to @MessageMapping controller methods
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific destinations
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))   // Fine-tuned in SecurityConfig CORS
                .withSockJS();                    // SockJS fallback for older clients
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Register the JWT auth interceptor so STOMP CONNECT frames
        // are authenticated and a Principal is set on the session.
        // Without this, headerAccessor.getUser() returns null in @MessageMapping handlers.
        registration.interceptors(webSocketAuthInterceptor);
    }
}
