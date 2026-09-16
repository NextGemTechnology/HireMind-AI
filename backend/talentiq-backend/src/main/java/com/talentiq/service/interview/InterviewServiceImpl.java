package com.talentiq.service.interview;

import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.infrastructure.mail.MailService;
import com.talentiq.model.JobApplication;
import com.talentiq.repository.application.JobApplicationRepository;
import com.talentiq.dto.interview.InterviewSlotDto;
import com.talentiq.model.InterviewSlot;
import com.talentiq.repository.interview.InterviewSlotRepository;
import com.talentiq.model.Notification;
import com.talentiq.repository.notification.NotificationRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InterviewServiceImpl implements InterviewService {

    private final InterviewSlotRepository slotRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public InterviewSlotDto.Response scheduleInterview(Long hrUserId, InterviewSlotDto.ScheduleRequest request) {
        User hrUser = userRepository.findById(hrUserId)
                .orElseThrow(() -> new ResourceNotFoundException("HR user not found: " + hrUserId));

        InterviewSlot slot;

        if (request.getApplicationId() != null && request.getApplicationId() > 0) {
            JobApplication application = applicationRepository.findById(request.getApplicationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + request.getApplicationId()));

            User candidateUser = userRepository.findById(application.getCandidate().getUser().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Candidate user not found"));

            slot = InterviewSlot.builder()
                    .applicationId(request.getApplicationId())
                    .hrUserId(hrUserId)
                    .hrName(hrUser.getFullName())
                    .candidateUserId(candidateUser.getId())
                    .candidateName(candidateUser.getFullName())
                    .candidateEmail(candidateUser.getEmail())
                    .jobTitle(application.getJob().getTitle())
                    .scheduledAt(request.getScheduledAt())
                    .durationMinutes(request.getDurationMinutes())
                    .meetingLink(request.getMeetingLink())
                    .notes(request.getNotes())
                    .status("PENDING")
                    .build();

            // Send interview schedule email to candidate
            mailService.sendInterviewScheduleEmail(
                    candidateUser.getEmail(),
                    candidateUser.getFullName(),
                    application.getJob().getTitle(),
                    request.getScheduledAt(),
                    request.getMeetingLink()
            );

            // Save in-app notification for candidate
            Notification notification = Notification.builder()
                    .user(candidateUser)
                    .title("Interview Scheduled 🎉")
                    .message("Your interview for " + application.getJob().getTitle() + " has been scheduled by " + hrUser.getFullName() + ".")
                    .type("INTERVIEW_SCHEDULED")
                    .linkUrl("/my-applications")
                    .build();
            notificationRepository.save(notification);

            // Push real-time WebSocket notification to candidate
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(candidateUser.getId()),
                    "/queue/notifications",
                    notification
            );
        } else {
            // Direct / custom meeting
            String candName = (request.getCandidateName() != null && !request.getCandidateName().isBlank())
                    ? request.getCandidateName().trim()
                    : "Candidate";
            String candEmail = (request.getCandidateEmail() != null) ? request.getCandidateEmail().trim() : "";
            String jobTitle = (request.getJobTitle() != null && !request.getJobTitle().isBlank())
                    ? request.getJobTitle().trim()
                    : "General Interview";

            slot = InterviewSlot.builder()
                    .applicationId(0L)
                    .hrUserId(hrUserId)
                    .hrName(hrUser.getFullName())
                    .candidateUserId(0L)
                    .candidateName(candName)
                    .candidateEmail(candEmail)
                    .jobTitle(jobTitle)
                    .scheduledAt(request.getScheduledAt())
                    .durationMinutes(request.getDurationMinutes())
                    .meetingLink(request.getMeetingLink())
                    .notes(request.getNotes())
                    .status("PENDING")
                    .build();

            if (!candEmail.isBlank()) {
                mailService.sendInterviewScheduleEmail(
                        candEmail,
                        candName,
                        jobTitle,
                        request.getScheduledAt(),
                        request.getMeetingLink()
                );
            }
        }

        InterviewSlot saved = slotRepository.save(slot);
        log.info("Interview scheduled: slotId={} at={} by HR={}", saved.getId(), request.getScheduledAt(), hrUserId);
        return toResponse(saved);
    }

    @Override
    public void sendSelectionEmail(Long hrUserId, InterviewSlotDto.SelectionEmailRequest request) {
        JobApplication application = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + request.getApplicationId()));

        User hrUser = userRepository.findById(hrUserId)
                .orElseThrow(() -> new ResourceNotFoundException("HR user not found: " + hrUserId));

        User candidateUser = userRepository.findById(application.getCandidate().getUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate user not found"));

        String message = (request.getCustomMessage() != null && !request.getCustomMessage().isBlank())
                ? request.getCustomMessage()
                : "Congratulations! We are pleased to inform you that your application has been shortlisted.";

        mailService.sendSelectionEmail(
                candidateUser.getEmail(),
                candidateUser.getFullName(),
                application.getJob().getTitle(),
                hrUser.getFullName(),
                message
        );

        // Save in-app notification
        Notification notification = Notification.builder()
                .user(candidateUser)
                .title("You've been selected! 🌟")
                .message("Great news from " + hrUser.getFullName() + " regarding your application for " + application.getJob().getTitle() + ".")
                .type("APPLICATION_STATUS")
                .linkUrl("/my-applications")
                .build();
        notificationRepository.save(notification);

        // Push real-time WS notification
        messagingTemplate.convertAndSendToUser(
                String.valueOf(candidateUser.getId()),
                "/queue/notifications",
                notification
        );

        log.info("Selection email sent: app={} candidate={} by HR={}", request.getApplicationId(), candidateUser.getEmail(), hrUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewSlotDto.Response> getCalendar(Long hrUserId) {
        return slotRepository
                .findByHrUserIdOrderByScheduledAtDesc(hrUserId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public InterviewSlotDto.Response updateStatus(Long slotId, Long hrUserId, InterviewSlotDto.StatusUpdateRequest request) {
        InterviewSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview slot not found: " + slotId));

        if (!slot.getHrUserId().equals(hrUserId)) {
            throw new ForbiddenException("You do not own this interview slot");
        }

        slot.setStatus(request.getStatus());
        return toResponse(slotRepository.save(slot));
    }

    @Override
    public InterviewSlotDto.Response deleteOrDeactivateSlot(Long slotId, Long hrUserId) {
        InterviewSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview slot not found: " + slotId));

        if (!slot.getHrUserId().equals(hrUserId)) {
            throw new ForbiddenException("You do not own this interview slot");
        }

        // If meeting time has passed (meeting is over/successful) -> Deactivate / mark as COMPLETED
        if (slot.getScheduledAt().isBefore(Instant.now())) {
            slot.setStatus("COMPLETED");
            InterviewSlot saved = slotRepository.save(slot);
            log.info("Interview {} time has passed; marked as COMPLETED/DEACTIVATED", slotId);
            return toResponse(saved);
        } else {
            // Future meeting -> Delete from database
            slotRepository.delete(slot);
            log.info("Future interview {} deleted by HR {}", slotId, hrUserId);
            return null;
        }
    }

    private InterviewSlotDto.Response toResponse(InterviewSlot slot) {
        return InterviewSlotDto.Response.builder()
                .id(slot.getId())
                .applicationId(slot.getApplicationId())
                .hrUserId(slot.getHrUserId())
                .hrName(slot.getHrName())
                .candidateUserId(slot.getCandidateUserId())
                .candidateName(slot.getCandidateName())
                .candidateEmail(slot.getCandidateEmail())
                .jobTitle(slot.getJobTitle())
                .scheduledAt(slot.getScheduledAt())
                .durationMinutes(slot.getDurationMinutes())
                .meetingLink(slot.getMeetingLink())
                .notes(slot.getNotes())
                .status(slot.getStatus())
                .reminderSent(slot.isReminderSent())
                .createdAt(slot.getCreatedAt())
                .build();
    }
}
