package com.talentiq.repository.company;

import com.talentiq.model.CompanyInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyInvitationRepository extends JpaRepository<CompanyInvitation, Long> {

    @Query("SELECT i FROM CompanyInvitation i JOIN FETCH i.company WHERE i.inviteToken = :inviteToken")
    Optional<CompanyInvitation> findByInviteToken(@Param("inviteToken") String inviteToken);

    @Query("SELECT i FROM CompanyInvitation i JOIN FETCH i.company WHERE i.inviteToken = :inviteToken AND i.status = :status")
    Optional<CompanyInvitation> findByInviteTokenAndStatus(@Param("inviteToken") String inviteToken, @Param("status") String status);

    @Query("SELECT i FROM CompanyInvitation i JOIN FETCH i.company WHERE i.company.id = :companyId ORDER BY i.createdAt DESC")
    List<CompanyInvitation> findByCompanyIdOrderByCreatedAtDesc(@Param("companyId") Long companyId);

    @Query("SELECT i FROM CompanyInvitation i JOIN FETCH i.company WHERE i.company.id = :companyId AND i.status = :status ORDER BY i.createdAt DESC")
    List<CompanyInvitation> findByCompanyIdAndStatusOrderByCreatedAtDesc(@Param("companyId") Long companyId, @Param("status") String status);

    Optional<CompanyInvitation> findByCompanyIdAndEmailAndStatus(Long companyId, String email, String status);

    long countByCompanyIdAndStatus(Long companyId, String status);

    List<CompanyInvitation> findByEmailAndStatus(String email, String status);

    @Query("SELECT i FROM CompanyInvitation i WHERE i.status = 'PENDING' AND i.expiresAt < :now")
    List<CompanyInvitation> findExpiredPending(@Param("now") Instant now);
}
