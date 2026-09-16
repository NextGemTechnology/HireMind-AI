package com.talentiq.config;

import com.talentiq.common.enums.Role;
import com.talentiq.model.ChatGroup;
import com.talentiq.model.Company;
import com.talentiq.model.User;
import com.talentiq.repository.chat.ChatGroupMemberRepository;
import com.talentiq.repository.chat.ChatGroupRepository;
import com.talentiq.security.jwt.JwtService;
import com.talentiq.security.jwt.TokenBlacklistService;
import com.talentiq.security.userdetails.CustomUserDetailsService;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.company.CompanySecurityService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyGroupSocketAccessTest {
    @Mock JwtService jwtService;
    @Mock TokenBlacklistService tokenBlacklistService;
    @Mock CustomUserDetailsService userDetailsService;
    @Mock ChatGroupMemberRepository groupMemberRepository;
    @Mock ChatGroupRepository groupRepository;
    @Mock CompanySecurityService companySecurityService;
    @InjectMocks WebSocketAuthInterceptor interceptor;
    private final UserPrincipal manager = new UserPrincipal(User.builder().id(7L).email("manager@example.com")
            .firstName("Test").lastName("Manager").roles(Set.of(Role.ROLE_COMPANY_ADMIN)).build());

    private Message<byte[]> subscription(boolean signedIn) {
        var headers = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        headers.setDestination("/topic/group.42");
        if (signedIn) {
            var authentication = new UsernamePasswordAuthenticationToken("7", null, List.of());
            authentication.setDetails("manager@example.com");
            headers.setUser(authentication);
        }
        headers.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
    }
    @Test void anonymousCannotSubscribe() {
        assertThat(interceptor.preSend(subscription(false), null)).isNull();
        verifyNoInteractions(groupMemberRepository);
    }
    @Test void nonMemberCannotSubscribe() {
        when(userDetailsService.loadUserByUsername("manager@example.com")).thenReturn(manager);
        assertThat(interceptor.preSend(subscription(true), null)).isNull();
        verifyNoInteractions(groupRepository);
    }
    @Test void memberCannotSubscribeToAnotherCompany() {
        when(userDetailsService.loadUserByUsername("manager@example.com")).thenReturn(manager);
        when(groupMemberRepository.existsByGroupIdAndUserId(42L, 7L)).thenReturn(true);
        when(companySecurityService.resolveManagerCompany(manager)).thenReturn(Company.builder().id(1L).build());
        when(groupRepository.findById(42L)).thenReturn(Optional.of(ChatGroup.builder().id(42L).companyId(2L).active(true).build()));
        assertThat(interceptor.preSend(subscription(true), null)).isNull();
    }
    @Test void ownCompanyMemberCanSubscribe() {
        when(userDetailsService.loadUserByUsername("manager@example.com")).thenReturn(manager);
        when(groupMemberRepository.existsByGroupIdAndUserId(42L, 7L)).thenReturn(true);
        when(companySecurityService.resolveManagerCompany(manager)).thenReturn(Company.builder().id(1L).build());
        when(groupRepository.findById(42L)).thenReturn(Optional.of(ChatGroup.builder().id(42L).companyId(1L).active(true).build()));
        var message = subscription(true);
        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }
}
