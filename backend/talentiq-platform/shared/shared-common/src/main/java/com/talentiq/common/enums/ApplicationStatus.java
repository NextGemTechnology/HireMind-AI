package com.talentiq.common.enums;

/**
 * Job application state machine.
 *
 * Flow:
 * APPLIED → SCREENING → SHORTLISTED → INTERVIEWING → OFFERED → HIRED
 *                    ↘ REJECTED (at any stage)
 *         ← WITHDRAWN (by candidate, any stage before OFFERED)
 */
public enum ApplicationStatus {
    APPLIED,
    SCREENING,
    SHORTLISTED,
    INTERVIEWING,
    OFFERED,
    HIRED,
    REJECTED,
    WITHDRAWN
}
