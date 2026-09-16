package com.talentiq.service.company;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.dto.company.CompanyDto;
import com.talentiq.model.Company;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompanyService Unit Tests")
class CompanyServiceImplTest {

    @Mock private CompanyRepository companyRepository;
    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private CompanyServiceImpl companyService;

    private User testUser;
    private CompanyDto.RegisterRequest regRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("hr@example.com")
                .firstName("John")
                .lastName("Doe")
                .roles(Set.of(Role.ROLE_HR))
                .build();

        regRequest = new CompanyDto.RegisterRequest();
        regRequest.setName("Tech Corp");
        regRequest.setSlug("tech-corp");
        regRequest.setIndustry("Technology");
        regRequest.setCompanySize("STARTUP");
    }

    @Test
    @DisplayName("should register company successfully and link HR profile as admin")
    void shouldRegisterCompanySuccessfully() {
        when(hrProfileRepository.existsByUserId(1L)).thenReturn(false);
        when(companyRepository.existsBySlug("tech-corp")).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> {
            Company c = i.getArgument(0);
            c.setId(100L);
            return c;
        });

        CompanyDto.Response response = companyService.registerCompany(1L, regRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getName()).isEqualTo("Tech Corp");
        assertThat(response.getSlug()).isEqualTo("tech-corp");

        verify(hrProfileRepository).save(any());
    }

    @Test
    @DisplayName("should throw ConflictException if company slug is already taken")
    void shouldThrowConflictIfSlugTaken() {
        when(hrProfileRepository.existsByUserId(1L)).thenReturn(false);
        when(companyRepository.existsBySlug("tech-corp")).thenReturn(true);

        assertThatThrownBy(() -> companyService.registerCompany(1L, regRequest))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already taken");
    }
}
