package com.talentiq.service.recommendation;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.recommendation.RecommendationDto;
import com.talentiq.dto.recommendation.RecommendationStatusDto;
import org.springframework.data.domain.Pageable;

public interface RecommendationService {

    PagedResponse<RecommendationDto> getJobRecommendationsForCandidate(Long userId, Pageable pageable);

    PagedResponse<RecommendationDto> getJobRecommendationsForCandidate(Long userId, Double minScore, boolean refresh, Pageable pageable);

    RecommendationStatusDto getRecommendationStatusForCandidate(Long userId);

    void recalculateAllRecommendationsForCandidate(Long candidateId);

    PagedResponse<RecommendationDto> getCandidateRecommendationsForJob(Long hrUserId, Long jobId, Pageable pageable);

    RecommendationDto computeRecommendationMatch(Long candidateId, Long jobId);
}
