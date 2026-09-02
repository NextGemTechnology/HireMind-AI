package com.talentiq.security.userdetails;

import com.talentiq.common.enums.Role;
import com.talentiq.model.HrProfile;
import com.talentiq.model.User;
import com.talentiq.model.auth.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Spring Security UserDetails implementation wrapping User or HR profile and credentials.
 * Completely isolates password and authentication state from public profile attributes.
 */
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String fullName;
    private final Set<Role> roles;
    private final User user;
    private final HrProfile hrProfile;
    private final UserCredential credential;
    private final String passwordHash;
    private final boolean locked;
    private final boolean active;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.roles = user.getRoles() != null ? user.getRoles() : Collections.emptySet();
        this.user = user;
        this.hrProfile = null;
        this.credential = null;
        this.passwordHash = null;
        this.locked = false;
        this.active = user.isActive();
    }

    public UserPrincipal(User user, UserCredential credential) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.roles = user.getRoles() != null ? user.getRoles() : Collections.emptySet();
        this.user = user;
        this.hrProfile = null;
        this.credential = credential;
        this.passwordHash = credential != null ? credential.getPasswordHash() : null;
        this.locked = credential != null && credential.isLocked();
        this.active = credential != null ? credential.isActive() : user.isActive();
    }

    public UserPrincipal(HrProfile hrProfile, HrCredential credential) {
        this.id = hrProfile.getId();
        this.email = hrProfile.getEmail();
        this.fullName = hrProfile.getFullName();
        this.roles = credential != null ? Set.of(credential.getRole()) : Set.of(Role.ROLE_HR);
        this.user = hrProfile.getUser();
        this.hrProfile = hrProfile;
        this.credential = null;
        this.passwordHash = credential != null ? credential.getPasswordHash() : null;
        this.locked = credential != null && credential.isLocked();
        this.active = credential != null ? credential.isActive() : hrProfile.isActive();
    }

    public UserPrincipal(User user, HrCredential credential) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.roles = user.getRoles() != null ? user.getRoles() : Set.of(Role.ROLE_HR);
        this.user = user;
        this.hrProfile = null;
        this.credential = null;
        this.passwordHash = credential != null ? credential.getPasswordHash() : null;
        this.locked = credential != null && credential.isLocked();
        this.active = credential != null ? credential.isActive() : user.isActive();
    }

    public UserPrincipal(User user, CompanyCredential credential) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.roles = user.getRoles() != null ? user.getRoles() : Set.of(Role.ROLE_COMPANY_ADMIN);
        this.user = user;
        this.hrProfile = null;
        this.credential = null;
        this.passwordHash = credential != null ? credential.getPasswordHash() : null;
        this.locked = credential != null && credential.isLocked();
        this.active = credential != null ? credential.isActive() : user.isActive();
    }

    public UserPrincipal(User user, AppDevCredential credential) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.roles = user.getRoles() != null ? user.getRoles() : Set.of(Role.ROLE_APP_DEVELOPER);
        this.user = user;
        this.hrProfile = null;
        this.credential = null;
        this.passwordHash = credential != null ? credential.getPasswordHash() : null;
        this.locked = credential != null && credential.isLocked();
        this.active = credential != null ? credential.isActive() : user.isActive();
    }

    public UserPrincipal(User user, ServiceTeamCredential credential) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.roles = user.getRoles() != null ? user.getRoles() : Set.of(Role.ROLE_SERVICE_TEAM);
        this.user = user;
        this.hrProfile = null;
        this.credential = null;
        this.passwordHash = credential != null ? credential.getPasswordHash() : null;
        this.locked = credential != null && credential.isLocked();
        this.active = credential != null ? credential.isActive() : user.isActive();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.name()))
                .collect(Collectors.toSet());
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !locked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    // ── TalentIQ-specific accessors ───────────────────────────────────────────

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public User getUser() {
        return user;
    }

    public HrProfile getHrProfile() {
        return hrProfile;
    }

    public UserCredential getCredential() {
        return credential;
    }

    public boolean hasRole(Role role) {
        return roles != null && roles.contains(role);
    }
}
