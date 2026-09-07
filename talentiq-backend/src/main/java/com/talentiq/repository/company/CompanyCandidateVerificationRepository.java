package com.talentiq.repository.company;

import com.talentiq.model.CompanyCandidateVerification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyCandidateVerificationRepository extends JpaRepository<CompanyCandidateVerification, Long> {

    @Query("SELECT v FROM CompanyCandidateVerification v " +
            "JOIN FETCH v.company c " +
            "LEFT JOIN FETCH v.hrUser h " +
            "LEFT JOIN FETCH v.hrProfile hp " +
            "JOIN FETCH v.candidateUser u " +
            "WHERE v.company.id = :companyId AND (:status IS NULL OR v.status = :status)")
    Page<CompanyCandidateVerification> findByCompanyIdAndStatus(
            @Param("companyId") Long companyId,
            @Param("status") String status,
            Pageable pageable);

    @Query("SELECT v FROM CompanyCandidateVerification v " +
            "JOIN FETCH v.company c " +
            "WHERE v.candidateUser.id = :candidateUserId AND v.status = 'APPROVED'")
    List<CompanyCandidateVerification> findApprovedByCandidateUserId(@Param("candidateUserId") Long candidateUserId);

    Optional<CompanyCandidateVerification> findByBadgeCertificateId(String badgeCertificateId);

    boolean existsByCompanyIdAndCandidateUserIdAndStatus(Long companyId, Long candidateUserId, String status);

    long countByCompanyIdAndStatus(Long companyId, String status);
}
