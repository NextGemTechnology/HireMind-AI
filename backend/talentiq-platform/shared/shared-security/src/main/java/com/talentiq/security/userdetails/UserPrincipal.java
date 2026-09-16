package com.talentiq.security.userdetails;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPrincipal implements UserDetails {

    private Long userId;
    private String email;
    private String password;
    private Long companyId;
    private List<String> roles;
    private String fullName;
    private String firstName;
    private String lastName;

    public Long getId() {
        return userId;
    }

    public UserPrincipal(Long userId, String email, String password, Long companyId, List<String> roles) {
        this(userId, email, password, companyId, roles, null, null, null);
    }

    public String getFullName() {
        if (fullName != null && !fullName.isBlank()) return fullName;
        if (firstName != null && !firstName.isBlank()) {
            return lastName != null && !lastName.isBlank() ? firstName + " " + lastName : firstName;
        }
        return email != null ? email : "";
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (roles == null) {
            return List.of();
        }
        return roles.stream()
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return password;
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
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    public boolean hasRole(String role) {
        if (roles == null || role == null) return false;
        String clean = role.startsWith("ROLE_") ? role.substring(5) : role;
        return roles.stream().anyMatch(r -> {
            String rClean = r.startsWith("ROLE_") ? r.substring(5) : r;
            return rClean.equalsIgnoreCase(clean);
        });
    }

    public boolean hasRole(com.talentiq.common.enums.Role role) {
        return role != null && hasRole(role.name());
    }
}
