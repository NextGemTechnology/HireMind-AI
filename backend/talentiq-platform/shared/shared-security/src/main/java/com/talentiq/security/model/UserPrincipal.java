package com.talentiq.security.model;

import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor
public class UserPrincipal extends com.talentiq.security.userdetails.UserPrincipal {

    public UserPrincipal(Long userId, String email, String password, Long companyId, List<String> roles) {
        super(userId, email, password, companyId, roles, null, null, null);
    }
}
