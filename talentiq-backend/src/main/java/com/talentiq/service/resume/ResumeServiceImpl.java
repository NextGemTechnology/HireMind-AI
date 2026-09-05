package com.talentiq.service.resume;

import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.infrastructure.storage.FileStorageService;
import com.talentiq.model.Candidate;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.dto.resume.ResumeDto;
import com.talentiq.model.Resume;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ResumeServiceImpl implements ResumeService {

    private final ResumeRepository resumeRepository;
    private final CandidateRepository candidateRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ResumeParserService resumeParserService;
    private final com.talentiq.service.ai.AiSecurityGateway aiSecurityGateway;

    private static final String SUBDIR = "resumes";

    @Override
    public ResumeDto uploadResume(Long userId, String versionName, MultipartFile file) {
        // Binary Magic Number validation via AI Security Gateway
        try {
            if (!aiSecurityGateway.validateResumeBinary(file.getInputStream(), file.getContentType(), file.getOriginalFilename())) {
                throw new com.talentiq.common.exception.BadRequestException("File rejected: file contents do not match authentic PDF or DOCX format.");
            }
        } catch (com.talentiq.common.exception.BadRequestException bre) {
            throw bre;
        } catch (Exception e) {
            log.warn("Could not inspect magic bytes: {}", e.getMessage());
        }

        Candidate candidate = candidateRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
            Candidate newCandidate = Candidate.builder()
                    .user(user)
                    .profileCompletion(20)
                    .build();
            return candidateRepository.save(newCandidate);
        });

        // Store file physically using local/S3 strategy
        String fileUrl = fileStorageService.storeFile(file, SUBDIR, userId);

        Resume resume = Resume.builder()
                .candidate(candidate)
                .versionName(versionName != null && !versionName.isBlank() ? versionName.trim() : "Default")
                .originalName(file.getOriginalFilename())
                .fileUrl(fileUrl)
                .fileType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .active(true)
                .parseStatus("PENDING")
                .build();

        Resume saved = resumeRepository.save(resume);

        // Deactivate other resumes for this candidate so only this new one is active
        resumeRepository.deactivateOtherResumes(candidate.getId(), saved.getId());

        // Trigger async parser pipeline
        resumeParserService.parseResumeAsync(saved.getId());

        log.info("Uploaded resume: {} as active version for candidate {}", saved.getOriginalName(), candidate.getId());
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getResumeFile(Long userId, Long resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));

        // Security check: Candidate can download own, or HR/Admin
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        boolean isOwner = resume.getCandidate().getUser().getId().equals(userId);
        boolean isHrOrAdmin = user.getRoles().stream().anyMatch(r ->
                r.name().contains("HR") || r.name().contains("ADMIN"));

        if (!isOwner && !isHrOrAdmin) {
            throw new ForbiddenException("You do not have permissions to download this resume");
        }

        return fileStorageService.retrieveFile(resume.getFileUrl());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResumeDto> listMyResumes(Long userId) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        List<Resume> resumes = resumeRepository.findAllByCandidateId(candidate.getId());
        return resumes.stream().map(this::mapToDto).toList();
    }

    @Override
    public ResumeDto setActiveResume(Long userId, Long resumeId) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));

        if (!resume.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("You do not own this resume version");
        }

        resume.setActive(true);
        Resume saved = resumeRepository.save(resume);

        resumeRepository.deactivateOtherResumes(candidate.getId(), saved.getId());
        log.info("Set resume version id {} as active for candidate {}", resumeId, candidate.getId());
        return mapToDto(saved);
    }

    @Override
    public void deleteResume(Long userId, Long resumeId) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", "userId", userId));

        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));

        if (!resume.getCandidate().getId().equals(candidate.getId())) {
            throw new ForbiddenException("You do not own this resume version");
        }

        if (resume.isActive()) {
            List<Resume> all = resumeRepository.findAllByCandidateId(candidate.getId());
            if (all.size() > 1) {
                throw new BadRequestException("Cannot delete active resume version when other versions exist. Please set another version active first.");
            }
        }

        // Delete physical file
        fileStorageService.deleteFile(resume.getFileUrl());

        // Delete database record
        resumeRepository.delete(resume);
        log.info("Deleted resume version id {} for candidate {}", resumeId, candidate.getId());
    }

    private ResumeDto mapToDto(Resume resume) {
        return ResumeDto.builder()
                .id(resume.getId())
                .candidateId(resume.getCandidate().getId())
                .versionName(resume.getVersionName())
                .originalName(resume.getOriginalName())
                .fileUrl(resume.getFileUrl())
                .fileType(resume.getFileType())
                .fileSizeBytes(resume.getFileSizeBytes())
                .active(resume.isActive())
                .parsed(resume.isParsed())
                .parseStatus(resume.getParseStatus())
                .parseError(resume.getParseError())
                .createdAt(resume.getCreatedAt())
                .build();
    }
}
