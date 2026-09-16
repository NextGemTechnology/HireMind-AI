package com.talentiq.gateway.filter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class CorrelationIdGlobalFilterTest {

    private CorrelationIdGlobalFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdGlobalFilter();
    }

    @Test
    void shouldGenerateCorrelationIdWhenMissing() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/jobs").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<String> downstreamCorrelationId = new AtomicReference<>();
        GatewayFilterChain chain = mutatedExchange -> {
            downstreamCorrelationId.set(
                    mutatedExchange.getRequest().getHeaders().getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER)
            );
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertNotNull(downstreamCorrelationId.get());
        assertFalse(downstreamCorrelationId.get().isBlank());
        assertEquals(downstreamCorrelationId.get(),
                exchange.getResponse().getHeaders().getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER));
    }

    @Test
    void shouldPreserveExistingCorrelationId() {
        String existingId = "custom-test-correlation-id-12345";
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/jobs")
                .header(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER, existingId)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<String> downstreamCorrelationId = new AtomicReference<>();
        GatewayFilterChain chain = mutatedExchange -> {
            downstreamCorrelationId.set(
                    mutatedExchange.getRequest().getHeaders().getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER)
            );
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertEquals(existingId, downstreamCorrelationId.get());
        assertEquals(existingId,
                exchange.getResponse().getHeaders().getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER));
    }
}
