FROM eclipse-temurin:21-jre-alpine
LABEL maintainer="TalentIQ Engineering <engineering@talentiq.ai>"
LABEL version="1.0.0"
LABEL description="TalentIQ AI Talent Intelligence Platform — API Gateway"

RUN addgroup -S talentiq && adduser -S talentiq -G talentiq
WORKDIR /app

COPY target/api-gateway-*.jar app.jar
RUN chown talentiq:talentiq app.jar
USER talentiq

EXPOSE 8080

ENV JAVA_OPTS="-Xms128m -Xmx512m \
    -XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:+UseG1GC \
    -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
