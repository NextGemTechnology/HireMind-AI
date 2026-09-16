# ============================================================
# TalentIQ Backend — Multi-stage Dockerfile
# Stage 1: Build with Maven
# Stage 2: Minimal JRE runtime image
# ============================================================

# ── Stage 1: Build ────────────────────────────────────────────
FROM maven:3.9.8-eclipse-temurin-21 AS builder

WORKDIR /build

# Cache dependencies first (layer optimization)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="TalentIQ Engineering <engineering@talentiq.ai>"
LABEL version="1.0.0"
LABEL description="TalentIQ AI Talent Intelligence Platform — Backend"

# Create non-root user for security
RUN addgroup -S talentiq && adduser -S talentiq -G talentiq

WORKDIR /app

# Create directories
RUN mkdir -p /app/uploads /var/log/talentiq \
    && chown -R talentiq:talentiq /app /var/log/talentiq

# Copy jar from build stage
COPY --from=builder /build/target/talentiq-backend-*.jar app.jar

# Switch to non-root user
USER talentiq

# Expose application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/actuator/health | grep -q '"status":"UP"' || exit 1

# JVM tuning for containerized environments
ENV JAVA_OPTS="-Xms256m -Xmx1g \
    -XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:+UseG1GC \
    -XX:+OptimizeStringConcat \
    -Djava.security.egd=file:/dev/./urandom \
    -Dspring.output.ansi.enabled=ALWAYS"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
