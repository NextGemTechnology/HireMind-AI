package com.talentiq.service.user;

import com.talentiq.common.enums.Role;
import com.talentiq.common.enums.UserStatus;
import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.dto.user.UserDto;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.model.auth.*;
import com.talentiq.repository.auth.*;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import com.talentiq.security.userdetails.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final HrProfileRepository hrProfileRepository;
    private final HrCredentialRepository hrCredentialRepository;
    private final CompanyCredentialRepository companyCredentialRepository;
    private final AppDevCredentialRepository appDevCredentialRepository;
    private final ServiceTeamCredentialRepository serviceTeamCredentialRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserDto.Response getUserProfile(UserPrincipal principal) {
        if (principal == null) {
            throw new BadRequestException("Unauthenticated user session");
        }

        String email = principal.getEmail();

        // 1. HR Profile check
        if (principal.hasRole(Role.ROLE_HR)) {
            Optional<HrProfile> hrOpt = hrProfileRepository.findByEmail(email)
                    .or(() -> hrProfileRepository.findById(principal.getId()));
            if (hrOpt.isPresent()) {
                HrProfile hr = hrOpt.get();
                Optional<HrCredential> hrCredOpt = hrCredentialRepository.findByEmail(hr.getEmail());
                Instant lastLogin = hrCredOpt.map(HrCredential::getLastLoginAt).orElse(null);
                UserStatus status = hrCredOpt.map(HrCredential::getStatus).orElse(hr.isActive() ? UserStatus.ACTIVE : UserStatus.SUSPENDED);
                boolean emailVerified = hrCredOpt.map(HrCredential::isEmailVerified).orElse(true);

                return UserDto.Response.builder()
                        .id(hr.getId())
                        .email(hr.getEmail())
                        .firstName(hr.getFirstName())
                        .lastName(hr.getLastName())
                        .phone(hr.getPhone())
                        .avatarUrl(hr.getAvatarUrl())
                        .status(status)
                        .emailVerified(emailVerified)
                        .roles(Set.of(Role.ROLE_HR))
                        .lastLoginAt(lastLogin)
                        .createdAt(hr.getCreatedAt())
                        .build();
            }
        }

        // 2. Company Admin check
        if (principal.hasRole(Role.ROLE_COMPANY_ADMIN)) {
            Optional<CompanyCredential> credOpt = companyCredentialRepository.findByEmail(email);
            if (credOpt.isPresent()) {
                CompanyCredential cred = credOpt.get();
                return UserDto.Response.builder()
                        .id(cred.getId())
                        .email(cred.getEmail())
                        .firstName("Company")
                        .lastName("Director")
                        .status(cred.getStatus())
                        .emailVerified(cred.isEmailVerified())
                        .roles(Set.of(Role.ROLE_COMPANY_ADMIN))
                        .lastLoginAt(cred.getLastLoginAt())
                        .createdAt(cred.getCreatedAt())
                        .build();
            }
        }

        // 3. App Developer check
        if (principal.hasRole(Role.ROLE_APP_DEVELOPER)) {
            Optional<AppDevCredential> credOpt = appDevCredentialRepository.findByEmail(email);
            if (credOpt.isPresent()) {
                AppDevCredential cred = credOpt.get();
                return UserDto.Response.builder()
                        .id(cred.getId())
                        .email(cred.getEmail())
                        .firstName("App")
                        .lastName("Developer")
                        .status(cred.getStatus())
                        .emailVerified(cred.isEmailVerified())
                        .roles(Set.of(Role.ROLE_APP_DEVELOPER))
                        .lastLoginAt(cred.getLastLoginAt())
                        .createdAt(cred.getCreatedAt())
                        .build();
            }
        }

        // 4. Management Team check
        if (principal.hasRole(Role.ROLE_SERVICE_TEAM)) {
            Optional<ServiceTeamCredential> credOpt = serviceTeamCredentialRepository.findByEmail(email);
            if (credOpt.isPresent()) {
                ServiceTeamCredential cred = credOpt.get();
                return UserDto.Response.builder()
                        .id(cred.getId())
                        .email(cred.getEmail())
                        .firstName("Management")
                        .lastName("Team")
                        .status(cred.getStatus())
                        .emailVerified(cred.isEmailVerified())
                        .roles(Set.of(Role.ROLE_SERVICE_TEAM))
                        .lastLoginAt(cred.getLastLoginAt())
                        .createdAt(cred.getCreatedAt())
                        .build();
            }
        }

        // 5. Standard Candidate / User
        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findById(principal.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return mapToResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto.Response getUserProfile(Long userId) {
        // Check if userId belongs to HR Profile first
        Optional<HrProfile> hrOpt = hrProfileRepository.findById(userId);
        if (hrOpt.isPresent()) {
            HrProfile hr = hrOpt.get();
            Optional<HrCredential> hrCredOpt = hrCredentialRepository.findByEmail(hr.getEmail());
            Instant lastLogin = hrCredOpt.map(HrCredential::getLastLoginAt).orElse(null);
            UserStatus status = hrCredOpt.map(HrCredential::getStatus).orElse(hr.isActive() ? UserStatus.ACTIVE : UserStatus.SUSPENDED);
            boolean emailVerified = hrCredOpt.map(HrCredential::isEmailVerified).orElse(true);

            return UserDto.Response.builder()
                    .id(hr.getId())
                    .email(hr.getEmail())
                    .firstName(hr.getFirstName())
                    .lastName(hr.getLastName())
                    .phone(hr.getPhone())
                    .avatarUrl(hr.getAvatarUrl())
                    .status(status)
                    .emailVerified(emailVerified)
                    .roles(Set.of(Role.ROLE_HR))
                    .lastLoginAt(lastLogin)
                    .createdAt(hr.getCreatedAt())
                    .build();
        }

        User user = findUserById(userId);
        return mapToResponse(user);
    }

    @Override
    public UserDto.Response updateUserProfile(UserPrincipal principal, UserDto.UpdateProfileRequest request) {
        if (principal == null) throw new BadRequestException("Unauthenticated user session");
        String email = principal.getEmail();

        if (principal.hasRole(Role.ROLE_HR)) {
            Optional<HrProfile> hrOpt = hrProfileRepository.findByEmail(email)
                    .or(() -> hrProfileRepository.findById(principal.getId()));
            if (hrOpt.isPresent()) {
                HrProfile hr = hrOpt.get();
                if (request.getFirstName() != null) hr.setFirstName(request.getFirstName().trim());
                if (request.getLastName() != null) hr.setLastName(request.getLastName().trim());
                if (request.getPhone() != null) hr.setPhone(request.getPhone().trim());
                if (request.getAvatarUrl() != null) hr.setAvatarUrl(request.getAvatarUrl().trim());
                HrProfile saved = hrProfileRepository.save(hr);

                Optional<HrCredential> hrCredOpt = hrCredentialRepository.findByEmail(saved.getEmail());
                UserStatus status = hrCredOpt.map(HrCredential::getStatus).orElse(saved.isActive() ? UserStatus.ACTIVE : UserStatus.SUSPENDED);
                boolean emailVerified = hrCredOpt.map(HrCredential::isEmailVerified).orElse(true);

                return UserDto.Response.builder()
                        .id(saved.getId())
                        .email(saved.getEmail())
                        .firstName(saved.getFirstName())
                        .lastName(saved.getLastName())
                        .phone(saved.getPhone())
                        .avatarUrl(saved.getAvatarUrl())
                        .status(status)
                        .emailVerified(emailVerified)
                        .roles(Set.of(Role.ROLE_HR))
                        .createdAt(saved.getCreatedAt())
                        .build();
            }
        }

        return updateUserProfile(principal.getId(), request);
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
    public void changePassword(UserPrincipal principal, UserDto.ChangePasswordRequest request) {
        if (principal == null) throw new BadRequestException("Unauthenticated user session");
        String email = principal.getEmail();

        if (principal.hasRole(Role.ROLE_HR)) {
            HrCredential cred = hrCredentialRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("HrCredential", "email", email));
            if (!passwordEncoder.matches(request.getCurrentPassword(), cred.getPasswordHash())) {
                throw new BadRequestException("Current password is incorrect");
            }
            hrCredentialRepository.updatePassword(cred.getId(), passwordEncoder.encode(request.getNewPassword()));
            return;
        }

        if (principal.hasRole(Role.ROLE_COMPANY_ADMIN)) {
            CompanyCredential cred = companyCredentialRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("CompanyCredential", "email", email));
            if (!passwordEncoder.matches(request.getCurrentPassword(), cred.getPasswordHash())) {
                throw new BadRequestException("Current password is incorrect");
            }
            companyCredentialRepository.updatePassword(cred.getId(), passwordEncoder.encode(request.getNewPassword()));
            return;
        }

        if (principal.hasRole(Role.ROLE_APP_DEVELOPER)) {
            AppDevCredential cred = appDevCredentialRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("AppDevCredential", "email", email));
            if (!passwordEncoder.matches(request.getCurrentPassword(), cred.getPasswordHash())) {
                throw new BadRequestException("Current password is incorrect");
            }
            appDevCredentialRepository.updatePassword(cred.getId(), passwordEncoder.encode(request.getNewPassword()));
            return;
        }

        if (principal.hasRole(Role.ROLE_SERVICE_TEAM)) {
            ServiceTeamCredential cred = serviceTeamCredentialRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("ServiceTeamCredential", "email", email));
            if (!passwordEncoder.matches(request.getCurrentPassword(), cred.getPasswordHash())) {
                throw new BadRequestException("Current password is incorrect");
            }
            serviceTeamCredentialRepository.updatePassword(cred.getId(), passwordEncoder.encode(request.getNewPassword()));
            return;
        }

        changePassword(principal.getId(), request);
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
        Instant lastLogin = userCredentialRepository.findByUserId(user.getId())
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
