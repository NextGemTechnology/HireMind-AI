package com.talentiq.service.portfolio;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.model.Candidate;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.dto.portfolio.PortfolioDto;
import com.talentiq.model.Portfolio;
import com.talentiq.repository.portfolio.PortfolioItemRepository;
import com.talentiq.repository.portfolio.PortfolioRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PortfolioService Unit Tests")
class PortfolioServiceImplTest {

    @Mock private PortfolioRepository portfolioRepository;
    @Mock private PortfolioItemRepository portfolioItemRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private PortfolioServiceImpl portfolioService;

    private User candidateUser;
    private Candidate candidate;
    private PortfolioDto.CreateRequest createReq;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder()
                .id(1L)
                .email("developer@example.com")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .build();

        candidate = Candidate.builder()
                .id(100L)
                .user(candidateUser)
                .build();

        createReq = new PortfolioDto.CreateRequest();
        createReq.setTitle("E-Commerce Microservices");
        createReq.setCategory("WEB");
        createReq.setProjectUrl("https://demo.example.com");
        createReq.setGithubUrl("https://github.com/example/demo");
    }

    @Test
    @DisplayName("should create portfolio showcase entry successfully")
    void shouldCreatePortfolioSuccessfully() {
        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(candidate));
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(i -> {
            Portfolio p = i.getArgument(0);
            p.setId(500L);
            return p;
        });

        PortfolioDto.Response response = portfolioService.createPortfolio(1L, createReq);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(500L);
        assertThat(response.getTitle()).isEqualTo("E-Commerce Microservices");

        verify(portfolioRepository).save(any(Portfolio.class));
    }

    @Test
    @DisplayName("should throw ForbiddenException if candidate updates portfolio owned by another candidate")
    void shouldThrowForbiddenOnForeignPortfolioUpdate() {
        Candidate foreignCandidate = Candidate.builder()
                .id(999L)
                .user(User.builder().id(9L).build())
                .build();

        Portfolio foreignPortfolio = Portfolio.builder()
                .id(500L)
                .candidate(foreignCandidate)
                .build();

        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(candidate));
        when(portfolioRepository.findById(500L)).thenReturn(Optional.of(foreignPortfolio));

        PortfolioDto.UpdateRequest updateReq = new PortfolioDto.UpdateRequest();
        updateReq.setTitle("New Title");

        assertThatThrownBy(() -> portfolioService.updatePortfolio(1L, 500L, updateReq))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("do not own this portfolio");
    }
}
