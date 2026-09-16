package com.talentiq.service.resume;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.ForbiddenException;
import com.talentiq.infrastructure.storage.FileStorageService;
import com.talentiq.model.Candidate;
import com.talentiq.repository.candidate.CandidateRepository;
import com.talentiq.dto.resume.ResumeDto;
import com.talentiq.model.Resume;
import com.talentiq.repository.resume.ResumeRepository;
import com.talentiq.model.User;
import com.talentiq.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ResumeService Unit Tests")
class ResumeServiceImplTest {

    @Mock private ResumeRepository resumeRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private UserRepository userRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private ResumeParserService resumeParserService;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    private User candidateUser;
    private Candidate candidate;
    private MockMultipartFile testFile;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder()
                .id(1L)
                .email("candidate@example.com")
                .roles(Set.of(Role.ROLE_CANDIDATE))
                .build();

        candidate = Candidate.builder()
                .id(100L)
                .user(candidateUser)
                .build();

        testFile = new MockMultipartFile(
                "file",
                "my_resume.pdf",
                "application/pdf",
                "dummy content".getBytes()
        );
    }

    @Test
    @DisplayName("should upload resume, store file, and deactivate other versions")
    void shouldUploadResumeSuccessfully() {
        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(candidate));
        when(fileStorageService.storeFile(any(), any(), anyLong())).thenReturn("resumes/stored_name.pdf");
        when(resumeRepository.save(any(Resume.class))).thenAnswer(i -> {
            Resume r = i.getArgument(0);
            r.setId(500L);
            return r;
        });

        ResumeDto response = resumeService.uploadResume(1L, "v2-revision", testFile);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(500L);
        assertThat(response.getVersionName()).isEqualTo("v2-revision");
        assertThat(response.isActive()).isTrue();

        verify(fileStorageService).storeFile(eq(testFile), eq("resumes"), eq(1L));
        verify(resumeRepository).deactivateOtherResumes(100L, 500L);
    }

    @Test
    @DisplayName("should throw ForbiddenException if user tries to set active on a resume they do not own")
    void shouldThrowForbiddenOnSettingActiveForeignResume() {
        Candidate otherCandidate = Candidate.builder()
                .id(999L)
                .user(User.builder().id(9L).build())
                .build();

        Resume foreignResume = Resume.builder()
                .id(500L)
                .candidate(otherCandidate)
                .build();

        when(candidateRepository.findByUserId(1L)).thenReturn(Optional.of(candidate));
        when(resumeRepository.findById(500L)).thenReturn(Optional.of(foreignResume));

        assertThatThrownBy(() -> resumeService.setActiveResume(1L, 500L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("do not own this resume");
    }
}
