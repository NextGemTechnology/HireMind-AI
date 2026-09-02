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
