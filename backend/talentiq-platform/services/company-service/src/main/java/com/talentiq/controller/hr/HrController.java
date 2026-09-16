package com.talentiq.controller.hr;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.hr.HrDto;
import com.talentiq.service.hr.HrService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/hr")
@RequiredArgsConstructor
@Tag(name = "HR Recruitment", description = "HR Profile operations, joining companies, and team management")
public class HrController {

    private final HrService hrService;

    @PostMapping("/join")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Join an existing company as HR member")
    public ResponseEntity<ApiResponse<HrDto.Response>> joinCompany(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody HrDto.JoinRequest request) {
        HrDto.Response response = hrService.joinCompany(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Successfully joined company", response));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Get own HR profile")
    public ResponseEntity<ApiResponse<HrDto.Response>> getMyHrProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        HrDto.Response response = hrService.getHrProfile(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Update designation / department in own HR profile")
    public ResponseEntity<ApiResponse<HrDto.Response>> updateMyHrProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody HrDto.UpdateRequest request) {
        HrDto.Response response = hrService.updateHrProfile(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("HR Profile updated", response));
    }

    @GetMapping("/team")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "List all HR team members in your company")
    public ResponseEntity<ApiResponse<List<HrDto.Response>>> getHrTeam(
            @AuthenticationPrincipal UserPrincipal principal) {
        // Fetch current user's HR profile to identify company id
        HrDto.Response me = hrService.getHrProfile(principal.getId());
        if (!me.isCompanyVerified() && !me.isCompanyAdmin()) {
            throw new com.talentiq.common.exception.ForbiddenException(
                    "Access Denied: You must be officially verified with an active company badge to view company HR team members.");
        }
        List<HrDto.Response> team = hrService.listCompanyHrProfiles(me.getCompany().getId());
        return ResponseEntity.ok(ApiResponse.success(team));
    }

    @PostMapping("/team/{id}/admin")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Delegate / revoke Company Admin status to team member")
    public ResponseEntity<ApiResponse<HrDto.Response>> setCompanyAdmin(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestParam boolean admin) {
        HrDto.Response response = hrService.setCompanyAdmin(principal.getId(), id, admin);
        return ResponseEntity.ok(ApiResponse.success(
                admin ? "Granted company administrator privileges" : "Revoked company administrator privileges",
                response
        ));
    }
}
