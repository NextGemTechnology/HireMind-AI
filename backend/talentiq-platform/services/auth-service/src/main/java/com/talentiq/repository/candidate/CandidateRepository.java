package com.talentiq.repository.candidate;

import com.talentiq.model.Candidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, Long>, JpaSpecificationExecutor<Candidate> {

    @EntityGraph(attributePaths = {"user"})
    Optional<Candidate> findByUserId(Long userId);

    @Override
    @EntityGraph(attributePaths = {"user"})
    Optional<Candidate> findById(Long id);

    boolean existsByUserId(Long userId);
}
