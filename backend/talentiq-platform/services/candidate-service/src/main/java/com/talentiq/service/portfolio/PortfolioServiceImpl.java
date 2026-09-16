package com.talentiq.service.portfolio;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.model.Candidate;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.dto.portfolio.PortfolioDto;
import com.talentiq.model.Portfolio;
import com.talentiq.model.PortfolioItem;
import com.talentiq.repository.portfolio.PortfolioItemRepository;
import com.talentiq.repository.portfolio.PortfolioRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PortfolioServiceImpl implements PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final CandidateRepository candidateRepository;
    private final UserRepository userRepository;

    @Override
    public PortfolioDto.Response createPortfolio(Long candidateUserId, PortfolioDto.CreateRequest request) {
        Candidate candidate = candidateRepository.findByUserId(candidateUserId).orElseGet(() -> {
            User user = userRepository.findById(candidateUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", candidateUserId));
            Candidate newCandidate = Candidate.builder()
                    .user(user)
                    .profileCompletion(20)
                    .build();
            return candidateRepository.save(newCandidate);
        });

        Portfolio portfolio = Portfolio.builder()
                .candidate(candidate)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .category(request.getCategory())
                .projectUrl(request.getProjectUrl())
                .githubUrl(request.getGithubUrl())
                .thumbnailUrl(request.getThumbnailUrl())
                .featured(Boolean.TRUE.equals(request.getFeatured()))
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        if (request.getItems() != null) {
            for (PortfolioDto.ItemDto itemDto : request.getItems()) {
                PortfolioItem item = PortfolioItem.builder()
                        .portfolio(portfolio)
                        .mediaType(itemDto.getMediaType() != null ? itemDto.getMediaType() : "IMAGE")
                        .mediaUrl(itemDto.getMediaUrl().trim())
                        .caption(itemDto.getCaption())
                        .displayOrder(itemDto.getDisplayOrder() != null ? itemDto.getDisplayOrder() : 0)
                        .build();
                portfolio.getItems().add(item);
            }
        }

        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("Created portfolio entry: {} for candidate ID {}", saved.getTitle(), candidate.getId());
        return mapToDto(saved);
    }

    @Override
    public PortfolioDto.Response updatePortfolio(Long candidateUserId, Long portfolioId, PortfolioDto.UpdateRequest request) {
        Candidate candidate = candidateRepository.findByUserId(candidateUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", candidateUserId));

        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new ResourceNotFoundException("Portfolio", "id", portfolioId));

        if (!portfolio.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("You do not own this portfolio entry");
        }

        if (request.getTitle() != null) portfolio.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) portfolio.setDescription(request.getDescription().trim());
        if (request.getCategory() != null) portfolio.setCategory(request.getCategory().trim());
        if (request.getProjectUrl() != null) portfolio.setProjectUrl(request.getProjectUrl().trim());
        if (request.getGithubUrl() != null) portfolio.setGithubUrl(request.getGithubUrl().trim());
        if (request.getThumbnailUrl() != null) portfolio.setThumbnailUrl(request.getThumbnailUrl().trim());
        if (request.getFeatured() != null) portfolio.setFeatured(request.getFeatured());
        if (request.getDisplayOrder() != null) portfolio.setDisplayOrder(request.getDisplayOrder());

        if (request.getItems() != null) {
            portfolio.getItems().clear();
            for (PortfolioDto.ItemDto itemDto : request.getItems()) {
                PortfolioItem item = PortfolioItem.builder()
                        .portfolio(portfolio)
                        .mediaType(itemDto.getMediaType() != null ? itemDto.getMediaType() : "IMAGE")
                        .mediaUrl(itemDto.getMediaUrl().trim())
                        .caption(itemDto.getCaption())
                        .displayOrder(itemDto.getDisplayOrder() != null ? itemDto.getDisplayOrder() : 0)
                        .build();
                portfolio.getItems().add(item);
            }
        }

        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("Updated portfolio entry ID {} for candidate ID {}", portfolioId, candidate.getId());
        return mapToDto(saved);
    }

    @Override
    public void deletePortfolio(Long candidateUserId, Long portfolioId) {
        Candidate candidate = candidateRepository.findByUserId(candidateUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", candidateUserId));

        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new ResourceNotFoundException("Portfolio", "id", portfolioId));

        if (!portfolio.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("You do not own this portfolio entry");
        }

        portfolioRepository.delete(portfolio);
        log.info("Deleted portfolio entry ID {} for candidate ID {}", portfolioId, candidate.getId());
    }

    @Override
    public PortfolioDto.Response getPortfolioById(Long portfolioId) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new ResourceNotFoundException("Portfolio", "id", portfolioId));
        portfolio.incrementViews();
        Portfolio saved = portfolioRepository.save(portfolio);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<PortfolioDto.Response> listPortfoliosByCandidate(Long candidateId, Pageable pageable) {
        Page<Portfolio> portfolios = portfolioRepository.findAllByCandidateIdOrderByDisplayOrderAsc(candidateId, pageable);
        return PagedResponse.of(portfolios.map(this::mapToDto));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<PortfolioDto.Response> listPortfoliosByCandidateUserId(Long candidateUserId, Pageable pageable) {
        Candidate candidate = candidateRepository.findByUserId(candidateUserId).orElse(null);
        if (candidate == null) {
            return PagedResponse.of(Page.empty());
        }
        Page<Portfolio> portfolios = portfolioRepository.findAllByCandidateIdOrderByDisplayOrderAsc(candidate.getId(), pageable);
        return PagedResponse.of(portfolios.map(this::mapToDto));
    }

    private PortfolioDto.Response mapToDto(Portfolio portfolio) {
        List<PortfolioDto.ItemDto> itemDtos = portfolio.getItems().stream()
                .map(i -> PortfolioDto.ItemDto.builder()
                        .id(i.getId())
                        .mediaType(i.getMediaType())
                        .mediaUrl(i.getMediaUrl())
                        .caption(i.getCaption())
                        .displayOrder(i.getDisplayOrder())
                        .build())
                .toList();

        return PortfolioDto.Response.builder()
                .id(portfolio.getId())
                .candidateId(portfolio.getCandidate().getId())
                .title(portfolio.getTitle())
                .description(portfolio.getDescription())
                .category(portfolio.getCategory())
                .projectUrl(portfolio.getProjectUrl())
                .githubUrl(portfolio.getGithubUrl())
                .thumbnailUrl(portfolio.getThumbnailUrl())
                .featured(portfolio.isFeatured())
                .displayOrder(portfolio.getDisplayOrder())
                .viewsCount(portfolio.getViewsCount())
                .likesCount(portfolio.getLikesCount())
                .items(itemDtos)
                .createdAt(portfolio.getCreatedAt())
                .build();
    }
}
