package com.talentiq.repository.admin;

import com.talentiq.model.AdminSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdminSessionRepository extends JpaRepository<AdminSession, Long> {

    Optional<AdminSession> findBySessionToken(String sessionToken);

    List<AdminSession> findByUserIdAndActiveTrue(Long userId);

    long countByUserIdAndActiveTrue(Long userId);

    @Modifying
    @Query("UPDATE AdminSession s SET s.active = false WHERE s.userId = :userId AND s.active = true")
    int deactivateAllUserSessions(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE AdminSession s SET s.lastActivityAt = :now WHERE s.sessionToken = :token")
    void updateLastActivity(@Param("token") String token, @Param("now") Instant now);

    @Modifying
    @Query("UPDATE AdminSession s SET s.active = false WHERE s.expiresAt < :now AND s.active = true")
    int deactivateExpiredSessions(@Param("now") Instant now);
}
