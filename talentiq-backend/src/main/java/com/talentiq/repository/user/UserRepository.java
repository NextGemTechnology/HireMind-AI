package com.talentiq.repository.user;

import com.talentiq.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * User Repository for pure business user profile operations.
 * Authentication queries and password management are handled by UserCredentialRepository.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findByEmailContainingIgnoreCase(String email, Pageable pageable);

    @Modifying
    @Query("UPDATE User u SET u.emailVerified = true, u.status = 'ACTIVE' WHERE u.id = :userId")
    void verifyEmail(@Param("userId") Long userId);
}
