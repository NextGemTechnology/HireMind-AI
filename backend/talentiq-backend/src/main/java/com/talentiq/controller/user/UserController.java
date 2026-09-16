package com.talentiq.controller.user;

import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.user.UserDto;
import com.talentiq.service.user.UserService;
import com.talentiq.security.userdetails.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "User account management, profile updates, password change")
public class UserController {

    private final UserService userService;
    private final com.talentiq.infrastructure.storage.FileStorageService fileStorageService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<ApiResponse<UserDto.Response>> getMyProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        UserDto.Response profile = userService.getUserProfile(principal);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update current authenticated user profile")
    public ResponseEntity<ApiResponse<UserDto.Response>> updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserDto.UpdateProfileRequest request) {
        UserDto.Response updated = userService.updateUserProfile(principal, request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }

    @PostMapping(value = "/me/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload and update user profile picture avatar")
    public ResponseEntity<ApiResponse<UserDto.Response>> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        UserDto.Response updated = userService.uploadAvatar(principal, file);
        return ResponseEntity.ok(ApiResponse.success("Profile picture updated successfully", updated));
    }

    @GetMapping("/avatar/**")
    @Operation(summary = "Publicly view/retrieve user profile picture avatar (Instagram style)")
    public ResponseEntity<byte[]> getAvatarFile(jakarta.servlet.http.HttpServletRequest request) {
        String fullPath = request.getRequestURI();
        int idx = fullPath.indexOf("/avatar/");
        if (idx == -1) {
            return ResponseEntity.notFound().build();
        }
        String subPath = fullPath.substring(idx + "/avatar/".length());
        // Sanitize path against directory traversal
        if (subPath.contains("..")) {
            return ResponseEntity.badRequest().build();
        }

        byte[] bytes = fileStorageService.retrieveFile(subPath);

        org.springframework.http.MediaType mediaType = org.springframework.http.MediaType.IMAGE_JPEG;
        String lower = subPath.toLowerCase();
        if (lower.endsWith(".png")) mediaType = org.springframework.http.MediaType.IMAGE_PNG;
        else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mediaType = org.springframework.http.MediaType.IMAGE_JPEG;
        else if (lower.endsWith(".gif")) mediaType = org.springframework.http.MediaType.IMAGE_GIF;
        else if (lower.endsWith(".webp")) mediaType = org.springframework.http.MediaType.parseMediaType("image/webp");
        else if (lower.endsWith(".svg")) mediaType = org.springframework.http.MediaType.parseMediaType("image/svg+xml");

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "public, max-age=604800, immutable")
                .body(bytes);
    }

    @PostMapping("/me/change-password")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Change account password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserDto.ChangePasswordRequest request) {
        userService.changePassword(principal, request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }
}
