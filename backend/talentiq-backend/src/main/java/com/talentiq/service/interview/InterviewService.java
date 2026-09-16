package com.talentiq.service.interview;

import com.talentiq.dto.interview.InterviewSlotDto;

import java.util.List;

public interface InterviewService {

    /**
     * Schedule an interview: create slot, send email to candidate, push WS notification.
     */
    InterviewSlotDto.Response scheduleInterview(Long hrUserId, InterviewSlotDto.ScheduleRequest request);

    /**
     * Send a "You are selected" email to the candidate for a given application.
     */
    void sendSelectionEmail(Long hrUserId, InterviewSlotDto.SelectionEmailRequest request);

    /**
     * Get all interview slots for the HR user.
     */
    List<InterviewSlotDto.Response> getCalendar(Long hrUserId);

    /**
     * Update status of an interview slot (CONFIRMED / CANCELLED / COMPLETED).
     */
    InterviewSlotDto.Response updateStatus(Long slotId, Long hrUserId, InterviewSlotDto.StatusUpdateRequest request);

    /**
     * Delete a future meeting or deactivate/complete an expired/past meeting.
     */
    InterviewSlotDto.Response deleteOrDeactivateSlot(Long slotId, Long hrUserId);
}
