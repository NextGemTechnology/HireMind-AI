package com.talentiq.service.employee;

import com.talentiq.common.enums.SalaryStatus;
import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.SalaryDto;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SalaryService {

    SalaryDto.Response createSalaryRecord(Long callerUserId, SalaryDto.CreateRequest request);

    SalaryDto.Response submitSalaryForApproval(Long callerUserId, Long salaryId);

    SalaryDto.Response decideSalaryApproval(Long callerUserId, Long salaryId, SalaryDto.ApprovalDecisionRequest request);

    PagedResponse<SalaryDto.Response> listCompanySalaries(Long callerUserId, SalaryStatus status, Pageable pageable);

    List<SalaryDto.Response> getEmployeeSalaryHistory(Long callerUserId, Long employeeId);

    List<SalaryDto.Response> getCandidateCompletedSalaries(Long candidateUserId);

    SalaryDto.StatsResponse getSalaryStats(Long callerUserId);
}
