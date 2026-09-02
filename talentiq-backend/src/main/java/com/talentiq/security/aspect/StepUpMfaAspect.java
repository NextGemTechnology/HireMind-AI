package com.talentiq.security.aspect;

import com.talentiq.common.exception.UnauthorizedException;
import com.talentiq.security.annotation.StepUpMfa;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.admin.MfaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class StepUpMfaAspect {

    private final MfaService mfaService;

    @Around("@annotation(stepUpMfa)")
    public Object enforceStepUpMfa(ProceedingJoinPoint joinPoint, StepUpMfa stepUpMfa) throws Throwable {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            Long userId = principal.getId();
            // If user has MFA enabled, require valid recent step-up verification
            if (mfaService.isMfaEnabled(userId)) {
                if (!mfaService.isStepUpValid(userId)) {
                    log.warn("Step-up MFA required for user {} on action: {}", userId, stepUpMfa.action());
                    throw new UnauthorizedException("Step-up MFA verification required for this sensitive operation. Please confirm with your 6-digit TOTP code.");
                }
            }
        }
        return joinPoint.proceed();
    }
}
