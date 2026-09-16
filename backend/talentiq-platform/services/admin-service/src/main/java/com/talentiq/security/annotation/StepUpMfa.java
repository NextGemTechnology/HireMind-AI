package com.talentiq.security.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * StepUpMfa — Annotation placed on sensitive admin endpoints requiring
 * recent (within 5 minutes) MFA TOTP confirmation before execution.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface StepUpMfa {
    String action() default "CRITICAL_ADMIN_ACTION";
}
