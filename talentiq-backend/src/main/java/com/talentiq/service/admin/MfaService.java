package com.talentiq.service.admin;

import java.util.List;
import java.util.Map;

public interface MfaService {

    Map<String, Object> setupTotp(Long userId, String userEmail);

    boolean verifyAndEnableTotp(Long userId, String code);

    boolean verifyTotp(Long userId, String code);

    boolean disableTotp(Long userId, String code);

    boolean isMfaEnabled(Long userId);

    List<String> regenerateBackupCodes(Long userId);

    void recordStepUpVerification(Long userId);

    boolean isStepUpValid(Long userId);
}
