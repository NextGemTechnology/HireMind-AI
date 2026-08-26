package com.talentiq.repository.user;

import com.talentiq.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

/**
 * User repository.
 * Uses Spring Data JPA — no boilerplate queries.
 * Custom JPQL queries only where necessary.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    org.springframework.data.domain.Page<User> findByEmailContainingIgnoreCase(String email, org.springframework.data.domain.Pageable pageable);

    Optional<User> findByEmailVerificationToken(String token);

    Optional<User> findByPasswordResetToken(String token);

    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = :loginAt, u.loginAttempts = 0, u.lockedUntil = NULL WHERE u.id = :userId")
    void recordSuccessfulLogin(@Param("userId") Long userId, @Param("loginAt") Instant loginAt);

    @Modifying
    @Query("UPDATE User u SET u.loginAttempts = u.loginAttempts + 1 WHERE u.id = :userId")
    void incrementLoginAttempts(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE User u SET u.emailVerified = true, u.emailVerificationToken = NULL, " +
            "u.emailVerificationTokenExpiresAt = NULL, u.status = 'ACTIVE' WHERE u.id = :userId")
    void verifyEmail(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE User u SET u.passwordHash = :newHash, u.passwordResetToken = NULL, " +
            "u.passwordResetTokenExpiresAt = NULL, u.passwordResetOtp = NULL, " +
            "u.passwordResetOtpExpiresAt = NULL, u.loginAttempts = 0, u.lockedUntil = NULL, " +
            "u.status = CASE WHEN u.status = 'LOCKED' THEN 'ACTIVE' ELSE u.status END WHERE u.id = :userId")
    void updatePassword(@Param("userId") Long userId, @Param("newHash") String newHash);
}
