FROM eclipse-temurin:21-jre-alpine
LABEL maintainer="TalentIQ Engineering <engineering@talentiq.ai>"
LABEL version="1.0.0"
LABEL description="TalentIQ AI Talent Intelligence Platform — Admin & Analytics Service"

RUN addgroup -S talentiq && adduser -S talentiq -G talentiq
WORKDIR /app

COPY target/admin-service-*.jar app.jar
RUN chown talentiq:talentiq app.jar
USER talentiq

EXPOSE 8089

ENV JAVA_OPTS="-Xms256m -Xmx512m \
    -XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:+UseG1GC \
    -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
