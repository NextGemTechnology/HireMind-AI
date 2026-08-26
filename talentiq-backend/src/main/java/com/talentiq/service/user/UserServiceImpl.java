package com.talentiq.service.user;

import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.dto.user.UserDto;
import com.talentiq.model.User;
import com.talentiq.model.auth.UserCredential;
import com.talentiq.repository.auth.UserCredentialRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserDto.Response getUserProfile(Long userId) {
        User user = findUserById(userId);
        return mapToResponse(user);
    }

    @Override
    public UserDto.Response updateUserProfile(Long userId, UserDto.UpdateProfileRequest request) {
        User user = findUserById(userId);

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null) user.setLastName(request.getLastName().trim());
        if (request.getPhone() != null) user.setPhone(request.getPhone().trim());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl().trim());

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    @Override
    public void changePassword(Long userId, UserDto.ChangePasswordRequest request) {
        UserCredential cred = userCredentialRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("UserCredential", "userId", userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), cred.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }

        userCredentialRepository.updatePassword(cred.getId(), passwordEncoder.encode(request.getNewPassword()));
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private UserDto.Response mapToResponse(User user) {
        java.time.Instant lastLogin = userCredentialRepository.findByUserId(user.getId())
                .map(UserCredential::getLastLoginAt)
                .orElse(null);

        return UserDto.Response.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getStatus())
                .emailVerified(user.isEmailVerified())
                .roles(user.getRoles())
                .lastLoginAt(lastLogin)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
