package com.talentiq.service.employee;

import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.EmployeeDto;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EmployeeService {

    EmployeeDto.Response onboardEmployee(Long callerUserId, EmployeeDto.OnboardRequest request);

    EmployeeDto.Response updateEmployee(Long callerUserId, Long employeeId, EmployeeDto.UpdateRequest request);

    EmployeeDto.Response verifyEmployee(Long callerUserId, Long employeeId, EmployeeDto.VerificationDecisionRequest request);

    EmployeeDto.Response requestTermination(Long callerUserId, Long employeeId, EmployeeDto.TerminationRequest request);

    EmployeeDto.Response decideTermination(Long callerUserId, Long employeeId, EmployeeDto.TerminationDecisionRequest request);

    EmployeeDto.Response suspendEmployee(Long callerUserId, Long employeeId, EmployeeDto.SuspendRequest request);

    EmployeeDto.Response reinstateEmployee(Long callerUserId, Long employeeId);

    EmployeeDto.Response getEmployeeById(Long callerUserId, Long employeeId);

    PagedResponse<EmployeeDto.Response> listCompanyEmployees(Long callerUserId, EmployeeStatus status, Pageable pageable);

    List<EmployeeDto.Response> getCandidateEmployments(Long candidateUserId);

    EmployeeDto.DashboardStatsResponse getCompanyDashboardStats(Long callerUserId);

    List<EmployeeDto.StatusHistoryResponse> getEmployeeStatusHistory(Long callerUserId, Long employeeId);
}
