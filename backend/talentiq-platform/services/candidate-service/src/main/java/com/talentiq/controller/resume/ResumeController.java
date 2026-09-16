package com.talentiq.controller.resume;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.resume.ResumeDto;
import com.talentiq.service.resume.ResumeService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/v1/resumes")
@RequiredArgsConstructor
@Tag(name = "Resume", description = "Resume uploads, version control, and downloads")
public class ResumeController {

    private final ResumeService resumeService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a new resume version")
    public ResponseEntity<ApiResponse<ResumeDto>> uploadResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String versionName,
            @RequestPart("file") MultipartFile file) {
        ResumeDto response = resumeService.uploadResume(principal.getId(), versionName, file);
        return ResponseEntity.ok(ApiResponse.success("Resume uploaded successfully", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Download/stream a resume file")
    public ResponseEntity<byte[]> downloadResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        byte[] fileBytes = resumeService.getResumeFile(principal.getId(), id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"resume_download\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(fileBytes);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all uploaded resume versions")
    public ResponseEntity<ApiResponse<List<ResumeDto>>> listMyResumes(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<ResumeDto> resumes = resumeService.listMyResumes(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(resumes));
    }

    @PutMapping("/{id}/active")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Set a resume version as active/primary")
    public ResponseEntity<ApiResponse<ResumeDto>> setActiveResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        ResumeDto response = resumeService.setActiveResume(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Active version switched", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a resume version")
    public ResponseEntity<ApiResponse<Void>> deleteResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        resumeService.deleteResume(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Resume version deleted"));
    }
}
