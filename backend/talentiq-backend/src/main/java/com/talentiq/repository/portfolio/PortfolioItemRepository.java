package com.talentiq.repository.portfolio;

import com.talentiq.model.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {
    List<PortfolioItem> findByPortfolioIdOrderByDisplayOrderAsc(Long portfolioId);
}
