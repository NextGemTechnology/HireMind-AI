package com.talentiq.service.hr;

import com.talentiq.dto.hr.HrDto;

import java.util.List;

public interface HrService {

    HrDto.Response joinCompany(Long userId, HrDto.JoinRequest request);

    HrDto.Response getHrProfile(Long userId);

    HrDto.Response updateHrProfile(Long userId, HrDto.UpdateRequest request);

    List<HrDto.Response> listCompanyHrProfiles(Long companyId);

    HrDto.Response setCompanyAdmin(Long adminUserId, Long targetHrId, boolean makeAdmin);
}
