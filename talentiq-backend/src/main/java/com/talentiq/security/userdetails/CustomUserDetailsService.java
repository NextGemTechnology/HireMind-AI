package com.talentiq.security.userdetails;

import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.model.auth.*;
import com.talentiq.repository.auth.*;
import com.talentiq.repository.hr.HrProfileRepository;
import com.talentiq.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static com.talentiq.common.constants.AppConstants.CACHE_USER;

/**
 * Spring Security UserDetailsService implementation.
 * Loads User Profile and role-specific Credentials safely.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final HrProfileRepository hrProfileRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final HrCredentialRepository hrCredentialRepository;
    private final CompanyCredentialRepository companyCredentialRepository;
    private final AppDevCredentialRepository appDevCredentialRepository;
    private final ServiceTeamCredentialRepository serviceTeamCredentialRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // 1. Check if user is HR
        Optional<HrCredential> hrCredOpt = hrCredentialRepository.findByEmail(email);
        if (hrCredOpt.isPresent()) {
            HrCredential hrCred = hrCredOpt.get();
            Optional<HrProfile> profileOpt = hrProfileRepository.findByEmail(email);
            if (profileOpt.isPresent()) {
                return new UserPrincipal(profileOpt.get(), hrCred);
            }
        }

        // 2. Check general users table
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            return buildPrincipal(userOpt.get());
        }

        throw new UsernameNotFoundException("User not found with email: " + email);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CACHE_USER, key = "#userId", unless = "#result == null")
    public UserPrincipal loadUserById(Long userId) {
        // 1. Check HR Profile by ID
        Optional<HrProfile> hrOpt = hrProfileRepository.findById(userId);
        if (hrOpt.isPresent()) {
            HrProfile profile = hrOpt.get();
            Optional<HrCredential> hrCred = hrCredentialRepository.findByEmail(profile.getEmail());
            return hrCred.map(cred -> new UserPrincipal(profile, cred)).orElseGet(() -> {
                HrCredential dummy = HrCredential.builder().email(profile.getEmail()).build();
                return new UserPrincipal(profile, dummy);
            });
        }

        // 2. Check general users table
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));
        return buildPrincipal(user);
    }

    private UserPrincipal buildPrincipal(User user) {
        // 1. Check HR credentials
        Optional<HrCredential> hrCred = hrCredentialRepository.findByUserId(user.getId());
        if (hrCred.isPresent()) {
            return new UserPrincipal(user, hrCred.get());
        }

        // 2. Check Company credentials
        Optional<CompanyCredential> compCred = companyCredentialRepository.findByUserId(user.getId());
        if (compCred.isPresent()) {
            return new UserPrincipal(user, compCred.get());
        }

        // 3. Check App Developer credentials
        Optional<AppDevCredential> devCred = appDevCredentialRepository.findByUserId(user.getId());
        if (devCred.isPresent()) {
            return new UserPrincipal(user, devCred.get());
        }

        // 4. Check Management Team credentials
        Optional<ServiceTeamCredential> mgmtCred = serviceTeamCredentialRepository.findByUserId(user.getId());
        if (mgmtCred.isPresent()) {
            return new UserPrincipal(user, mgmtCred.get());
        }

        // 5. Default User / Candidate credentials
        Optional<UserCredential> userCred = userCredentialRepository.findByUserId(user.getId());
        return userCred.map(cred -> new UserPrincipal(user, cred)).orElseGet(() -> new UserPrincipal(user));
    }
}
