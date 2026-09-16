package com.talentiq.service.company;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.dto.company.CompanyInvitationDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class CompanyInvitationRoleTest {
    @InjectMocks CompanyInvitationServiceImpl service;

    @Test void managerCannotInviteAnElevatedAdministrator() {
        for (Role role : new Role[] { Role.ROLE_SUPER_ADMIN, Role.ROLE_COMPANY_ADMIN, Role.ROLE_APP_DEVELOPER }) {
            var request = CompanyInvitationDto.CreateRequest.builder().email("test@example.com").role(role).build();
            assertThatThrownBy(() -> service.createInvitation(7L, request)).isInstanceOf(BadRequestException.class);
        }
    }
}
