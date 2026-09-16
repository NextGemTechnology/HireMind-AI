package com.talentiq.service.company;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.dto.company.CompanyTaskDto;
import com.talentiq.model.Company;
import com.talentiq.model.CompanyTask;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.repository.company.CompanyTaskRepository;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyTaskIsolationTest {
    @Mock CompanyTaskRepository taskRepository;
    @Mock CompanyRepository companyRepository;
    @Mock HrProfileRepository hrProfileRepository;
    @Mock UserRepository userRepository;
    @Mock CompanySecurityService companySecurityService;
    @InjectMocks CompanyTaskServiceImpl service;

    private void foreignTask() {
        when(companySecurityService.currentManagerCompany(7L)).thenReturn(Optional.of(Company.builder().id(1L).build()));
        when(taskRepository.findById(99L)).thenReturn(Optional.of(CompanyTask.builder().id(99L)
                .company(Company.builder().id(2L).build()).status("TODO").build()));
    }

    @Test void cannotUpdateForeignTask() {
        foreignTask();
        var request = new CompanyTaskDto.UpdateStatusRequest();
        request.setStatus("COMPLETED");
        assertThatThrownBy(() -> service.updateTaskStatus(7L, 99L, request)).isInstanceOf(ForbiddenException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test void cannotDeleteForeignTask() {
        foreignTask();
        assertThatThrownBy(() -> service.deleteTask(7L, 99L)).isInstanceOf(ForbiddenException.class);
        verify(taskRepository, never()).delete(any());
    }
}
