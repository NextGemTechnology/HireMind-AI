package com.talentiq.service.hr;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.model.Company;
import com.talentiq.dto.hr.HrDto;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("HrService Unit Tests")
class HrServiceImplTest {

    @Mock private HrProfileRepository hrProfileRepository;

    @InjectMocks
    private HrServiceImpl hrService;

    private User adminUser;
    private User teamUser;
    private Company testCompany;
    private HrProfile adminProfile;
    private HrProfile teamProfile;

    @BeforeEach
    void setUp() {
        testCompany = Company.builder()
                .id(1L)
                .name("Acme Corp")
                .build();

        adminUser = User.builder().id(1L).email("admin@acme.com").firstName("Alice").build();
        teamUser = User.builder().id(2L).email("recruiter@acme.com").firstName("Bob").build();

        adminProfile = HrProfile.builder()
                .id(10L)
                .user(adminUser)
                .company(testCompany)
                .companyAdmin(true)
                .build();

        teamProfile = HrProfile.builder()
                .id(20L)
                .user(teamUser)
                .company(testCompany)
                .companyAdmin(false)
                .build();
    }

    @Test
    @DisplayName("should set company admin status successfully by another admin")
    void shouldSetCompanyAdminSuccessfully() {
        when(hrProfileRepository.findByUserId(1L)).thenReturn(Optional.of(adminProfile));
        when(hrProfileRepository.findById(20L)).thenReturn(Optional.of(teamProfile));
        when(hrProfileRepository.save(any(HrProfile.class))).thenAnswer(i -> i.getArgument(0));

        HrDto.Response response = hrService.setCompanyAdmin(1L, 20L, true);

        assertThat(response.isCompanyAdmin()).isTrue();
        verify(hrProfileRepository).save(teamProfile);
    }

    @Test
    @DisplayName("should throw ForbiddenException if requester is not company admin")
    void shouldThrowForbiddenIfRequesterNotAdmin() {
        // Set requester admin flag to false
        adminProfile.setCompanyAdmin(false);
        when(hrProfileRepository.findByUserId(1L)).thenReturn(Optional.of(adminProfile));

        assertThatThrownBy(() -> hrService.setCompanyAdmin(1L, 20L, true))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("administrators");
    }
}
