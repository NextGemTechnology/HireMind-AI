package com.talentiq.repository.auth;

import com.talentiq.model.auth.CompanyCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface CompanyCredentialRepository extends JpaRepository<CompanyCredential, Long> {

    Optional<CompanyCredential> findByEmail(String email);

    Optional<CompanyCredential> findByUserId(Long userId);

    boolean existsByEmail(String email);

    @Modifying
    @Query("UPDATE CompanyCredential c SET c.lastLoginAt = :loginAt, c.loginAttempts = 0, c.lockedUntil = NULL WHERE c.id = :id")
    void recordSuccessfulLogin(@Param("id") Long id, @Param("loginAt") Instant loginAt);

    @Modifying
    @Query("UPDATE CompanyCredential c SET c.loginAttempts = c.loginAttempts + 1 WHERE c.id = :id")
    void incrementLoginAttempts(@Param("id") Long id);

    @Modifying
    @Query("UPDATE CompanyCredential c SET c.lockedUntil = :lockedUntil WHERE c.id = :id")
    void lockAccount(@Param("id") Long id, @Param("lockedUntil") Instant lockedUntil);

    @Modifying
    @Query("UPDATE CompanyCredential c SET c.passwordHash = :newHash, c.passwordResetOtp = NULL, " +
            "c.passwordResetOtpExpiresAt = NULL, c.loginAttempts = 0, c.lockedUntil = NULL, " +
            "c.status = CASE WHEN c.status = 'LOCKED' THEN 'ACTIVE' ELSE c.status END WHERE c.id = :id")
    void updatePassword(@Param("id") Long id, @Param("newHash") String newHash);

    @Modifying
    @Query("UPDATE CompanyCredential c SET c.passwordResetOtp = :otp, c.passwordResetOtpExpiresAt = :expiresAt WHERE c.id = :id")
    void savePasswordResetOtp(@Param("id") Long id, @Param("otp") String otp, @Param("expiresAt") Instant expiresAt);
}
