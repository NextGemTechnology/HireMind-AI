package com.talentiq;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/**
 * Spring Boot context load test.
 * Verifies the application context starts successfully.
 * Uses H2 in-memory database to avoid requiring MySQL in CI.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=MySQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false",
        "spring.data.redis.host=localhost",
        "spring.data.redis.port=6379",
        "app.jwt.secret=dGVzdC1zZWNyZXQta2V5LWZvci11bml0LXRlc3RpbmctbXVzdC1iZS1sb25n",
        "app.cors.allowed-origins=http://localhost:3000",
        "app.ai.openai.api-key=test-key",
        "spring.cache.type=none",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration," +
                "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration," +
                "org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration"
})
class TalentIqApplicationTests {

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.data.redis.connection.RedisConnectionFactory redisConnectionFactory;

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;

    @Test
    void contextLoads() {
        // Application context must load without errors
    }
}
