package com.talentiq.service.hr;

import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.model.Company;
import com.talentiq.repository.company.CompanyRepository;
import com.talentiq.service.company.CompanyServiceImpl;
import com.talentiq.dto.hr.HrDto;
import com.talentiq.model.HrProfile;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class HrServiceImpl implements HrService {

    private final HrProfileRepository hrProfileRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @Override
    public HrDto.Response joinCompany(Long userId, HrDto.JoinRequest request) {
        if (hrProfileRepository.existsByUserId(userId) || hrProfileRepository.existsById(userId)) {
            throw new BadRequestException("You are already associated with a company profile");
        }

        User user = userRepository.findById(userId).orElse(null);
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));

        HrProfile profile = HrProfile.builder()
                .user(user)
                .email(user != null ? user.getEmail() : null)
                .firstName(user != null ? user.getFirstName() : null)
                .lastName(user != null ? user.getLastName() : null)
                .company(company)
                .designation(request.getDesignation())
                .department(request.getDepartment())
                .companyAdmin(false)
                .build();

        HrProfile saved = hrProfileRepository.save(profile);
        log.info("HR user {} joined company {}", saved.getEmail(), company.getName());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public HrDto.Response getHrProfile(Long hrId) {
        HrProfile profile = hrProfileRepository.findById(hrId)
                .or(() -> hrProfileRepository.findByUserId(hrId))
                .orElseThrow(() -> new ResourceNotFoundException("HR Profile", "id", hrId));
        return mapToResponse(profile);
    }

    @Override
    public HrDto.Response updateHrProfile(Long hrId, HrDto.UpdateRequest request) {
        HrProfile profile = hrProfileRepository.findById(hrId)
                .or(() -> hrProfileRepository.findByUserId(hrId))
                .orElseThrow(() -> new ResourceNotFoundException("HR Profile", "id", hrId));

        if (request.getDesignation() != null) profile.setDesignation(request.getDesignation().trim());
        if (request.getDepartment() != null) profile.setDepartment(request.getDepartment().trim());

        HrProfile saved = hrProfileRepository.save(profile);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HrDto.Response> listCompanyHrProfiles(Long companyId) {
        List<HrProfile> profiles = hrProfileRepository.findAllByCompanyId(companyId);
        return profiles.stream().map(this::mapToResponse).toList();
    }

    @Override
    public HrDto.Response setCompanyAdmin(Long adminUserId, Long targetHrId, boolean makeAdmin) {
        HrProfile requester = hrProfileRepository.findByUserId(adminUserId)
                .or(() -> hrProfileRepository.findById(adminUserId))
                .orElseThrow(() -> new ForbiddenException("Only company administrators can perform this action"));

        if (!requester.isCompanyAdmin()) {
            throw new ForbiddenException("Only company administrators can perform this action");
        }

        HrProfile target = hrProfileRepository.findById(targetHrId)
                .orElseThrow(() -> new ResourceNotFoundException("HR Profile", "id", targetHrId));

        if (!target.getCompany().getId().equals(requester.getCompany().getId())) {
            throw new ForbiddenException("Target HR is not in the same company");
        }

        target.setCompanyAdmin(makeAdmin);
        HrProfile saved = hrProfileRepository.save(target);
        log.info("HR admin status of user {} set to {} by {}", target.getEmail(), makeAdmin, requester.getEmail());
        return mapToResponse(saved);
    }

    private HrDto.Response mapToResponse(HrProfile profile) {
        String firstName = profile.getFirstName() != null ? profile.getFirstName() : (profile.getUser() != null ? profile.getUser().getFirstName() : "");
        String lastName = profile.getLastName() != null ? profile.getLastName() : (profile.getUser() != null ? profile.getUser().getLastName() : "");
        Long userId = profile.getUser() != null ? profile.getUser().getId() : profile.getId();
        return HrDto.Response.builder()
                .id(profile.getId())
                .userId(userId)
                .email(profile.getEmail())
                .firstName(firstName)
                .lastName(lastName)
                .company(CompanyServiceImpl.mapToResponse(profile.getCompany()))
                .designation(profile.getDesignation())
                .department(profile.getDepartment())
                .companyAdmin(profile.isCompanyAdmin())
                .active(profile.isActive())
                .build();
    }
}
