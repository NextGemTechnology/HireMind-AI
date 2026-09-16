package com.talentiq.repository.company;

import com.talentiq.model.Company;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long>, JpaSpecificationExecutor<Company> {

    Optional<Company> findByName(String name);

    Optional<Company> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Page<Company> findAllByActiveTrue(Pageable pageable);

    Page<Company> findAllByVerifiedFalse(Pageable pageable);

    Optional<Company> findByRegisteredByUserId(Long registeredByUserId);

    Optional<Company> findByEmail(String email);
}
