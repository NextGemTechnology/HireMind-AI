package com.talentiq.service.company;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ConflictException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.model.Company;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.security.userdetails.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompanySecurityService Unit Tests")
class CompanySecurityServiceTest {

    @Mock private HrProfileRepository hrProfileRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private CompanySecurityServiceImpl companySecurityService;

    private Company companyA;
    private Company companyB;
    private User hrUser;
    private HrProfile verifiedHrProfile;
    private HrProfile unverifiedHrProfile;

    @BeforeEach
    void setUp() {
        companyA = Company.builder()
                .id(100L)
                .name("Acme Corp")
                .slug("acme")
                .active(true)
                .build();

        companyB = Company.builder()
                .id(200L)
                .name("Beta Tech")
                .slug("beta")
                .active(true)
                .build();

        hrUser = User.builder()
                .id(1L)
                .email("recruiter@acme.com")
                .firstName("Alice")
                .lastName("Smith")
                .roles(Set.of(Role.ROLE_HR))
                .build();

        verifiedHrProfile = HrProfile.builder()
                .id(10L)
                .user(hrUser)
                .email("recruiter@acme.com")
                .company(companyA)
                .companyVerified(true)
                .companyVerifiedAt(Instant.now())
                .companyVerifiedTitle("Senior Talent Partner")
                .active(true)
                .build();

        unverifiedHrProfile = HrProfile.builder()
                .id(11L)
                .user(hrUser)
                .email("recruiter@acme.com")
                .company(companyA)
                .companyVerified(false)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("should allow access when HR recruiter is officially verified for target company")
    void shouldAllowAccessForVerifiedHr() {
        when(hrProfileRepository.findById(1L)).thenReturn(Optional.of(verifiedHrProfile));

        HrProfile result = companySecurityService.enforceVerifiedHrAccess(1L, 100L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getCompany().getId()).isEqualTo(100L);
        assertThat(result.isCompanyVerified()).isTrue();
    }

    @Test
    @DisplayName("should throw ForbiddenException when HR recruiter is not officially verified")
    void shouldThrowForbiddenWhenHrNotVerified() {
        when(hrProfileRepository.findById(1L)).thenReturn(Optional.of(unverifiedHrProfile));

        assertThatThrownBy(() -> companySecurityService.enforceVerifiedHrAccess(1L, 100L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("not officially verified");
    }

    @Test
    @DisplayName("should throw ForbiddenException on cross-company access attempt")
    void shouldThrowForbiddenOnCrossCompanyAccess() {
        when(hrProfileRepository.findById(1L)).thenReturn(Optional.of(verifiedHrProfile));

        assertThatThrownBy(() -> companySecurityService.enforceVerifiedHrAccess(1L, 200L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Cross-company access violation");
    }

    @Test
    @DisplayName("should throw ConflictException if HR already holds an active badge for another company")
    void shouldThrowConflictWhenHrAlreadyHasActiveBadge() {
        when(hrProfileRepository.findById(10L)).thenReturn(Optional.of(verifiedHrProfile));

        // Company B attempts to verify an HR who is already verified with Company A
        assertThatThrownBy(() -> companySecurityService.validateSingleActiveBadge(10L, 200L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already holds an active corporate verification badge");
    }

    @Test
    @DisplayName("should allow single active badge check for the same company")
    void shouldAllowSingleActiveBadgeForSameCompany() {
        when(hrProfileRepository.findById(10L)).thenReturn(Optional.of(verifiedHrProfile));

        // Re-verifying for the same company is allowed
        companySecurityService.validateSingleActiveBadge(10L, 100L);
    }

    @Test
    @DisplayName("should allow Super Admin access across any company")
    void shouldAllowSuperAdminAccess() {
        User superAdminUser = User.builder()
                .id(999L)
                .email("superadmin@talentiq.com")
                .roles(Set.of(Role.ROLE_SUPER_ADMIN))
                .build();
        UserPrincipal superAdmin = new UserPrincipal(superAdminUser);

        // Should not throw any exception
        companySecurityService.validateCompanyAccess(superAdmin, 200L);
    }
}
