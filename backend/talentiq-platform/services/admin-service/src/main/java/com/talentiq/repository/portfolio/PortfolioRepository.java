package com.talentiq.repository.portfolio;

import com.talentiq.model.Portfolio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    Page<Portfolio> findAllByCandidateIdOrderByDisplayOrderAsc(Long candidateId, Pageable pageable);
}
