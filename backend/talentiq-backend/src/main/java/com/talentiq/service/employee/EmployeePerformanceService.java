package com.talentiq.service.employee;

import com.talentiq.common.response.PagedResponse;
import com.talentiq.dto.employee.EmployeePerformanceDto;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EmployeePerformanceService {

    EmployeePerformanceDto.Response createPerformanceReview(Long reviewerUserId, EmployeePerformanceDto.CreateRequest request);

    PagedResponse<EmployeePerformanceDto.Response> listCompanyPerformanceReviews(Long reviewerUserId, Pageable pageable);

    EmployeePerformanceDto.PerformanceStatsResponse getPerformanceStats(Long reviewerUserId);

    List<EmployeePerformanceDto.Response> getEmployeeReviews(Long reviewerUserId, Long employeeId);
}
