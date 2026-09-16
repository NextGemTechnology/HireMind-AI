package com.talentiq.service.resume;

import com.talentiq.dto.resume.ResumeDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ResumeService {

    ResumeDto uploadResume(Long userId, String versionName, MultipartFile file);

    byte[] getResumeFile(Long userId, Long resumeId);

    List<ResumeDto> listMyResumes(Long userId);

    ResumeDto setActiveResume(Long userId, Long resumeId);

    void deleteResume(Long userId, Long resumeId);
}
