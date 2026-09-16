package com.talentiq.service.user;

import com.talentiq.dto.user.UserDto;
import com.talentiq.security.userdetails.UserPrincipal;

public interface UserService {

    UserDto.Response getUserProfile(UserPrincipal principal);

    UserDto.Response getUserProfile(Long userId);

    UserDto.Response updateUserProfile(UserPrincipal principal, UserDto.UpdateProfileRequest request);

    UserDto.Response updateUserProfile(Long userId, UserDto.UpdateProfileRequest request);

    void changePassword(UserPrincipal principal, UserDto.ChangePasswordRequest request);

    void changePassword(Long userId, UserDto.ChangePasswordRequest request);

    UserDto.Response uploadAvatar(UserPrincipal principal, org.springframework.web.multipart.MultipartFile file);
}
