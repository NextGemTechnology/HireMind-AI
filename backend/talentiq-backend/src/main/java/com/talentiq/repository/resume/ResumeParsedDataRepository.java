package com.talentiq.repository.resume;

import com.talentiq.model.ResumeParsedData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResumeParsedDataRepository extends JpaRepository<ResumeParsedData, Long> {
    Optional<ResumeParsedData> findByResumeId(Long resumeId);
}
