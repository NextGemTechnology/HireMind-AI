package com.talentiq.controller.interview;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.interview.InterviewSlotDto;
import com.talentiq.service.interview.InterviewService;
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
@RequestMapping("/v1/interviews")
@RequiredArgsConstructor
@Tag(name = "Interview Calendar", description = "HR interview scheduling and selection email APIs")
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping("/schedule")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Schedule an interview slot — sends email to candidate")
    public ResponseEntity<ApiResponse<InterviewSlotDto.Response>> scheduleInterview(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InterviewSlotDto.ScheduleRequest request) {
        InterviewSlotDto.Response slot = interviewService.scheduleInterview(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Interview scheduled successfully", slot));
    }

    @PostMapping("/select")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Send 'You are selected' email to candidate")
    public ResponseEntity<ApiResponse<Void>> sendSelectionEmail(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InterviewSlotDto.SelectionEmailRequest request) {
        interviewService.sendSelectionEmail(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Selection email sent successfully"));
    }

    @GetMapping("/calendar")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get HR's upcoming and past interview calendar slots")
    public ResponseEntity<ApiResponse<List<InterviewSlotDto.Response>>> getCalendar(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<InterviewSlotDto.Response> slots = interviewService.getCalendar(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(slots));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update interview slot status (CONFIRMED / CANCELLED / COMPLETED)")
    public ResponseEntity<ApiResponse<InterviewSlotDto.Response>> updateStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InterviewSlotDto.StatusUpdateRequest request) {
        InterviewSlotDto.Response updated = interviewService.updateStatus(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Interview status updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Delete future interview slot or deactivate past completed meeting")
    public ResponseEntity<ApiResponse<InterviewSlotDto.Response>> deleteMeeting(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        InterviewSlotDto.Response result = interviewService.deleteOrDeactivateSlot(id, principal.getId());
        if (result != null) {
            return ResponseEntity.ok(ApiResponse.success("Meeting time is over; meeting marked as COMPLETED/DEACTIVATED in history.", result));
        }
        return ResponseEntity.ok(ApiResponse.success("Upcoming meeting successfully deleted.", null));
    }
}
