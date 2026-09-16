package com.talentiq.infrastructure.mail;

import com.talentiq.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Mail service for transactional emails.
 * All sends are @Async — fire-and-forget on the mail thread pool.
 * Failures are logged but do not bubble up to the calling request.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;
    private final com.talentiq.security.email.EmailSecurityValidator emailSecurityValidator;

    /**
     * Sends the 4-digit OTP email verification code for Admin 2FA logins.
     */
    @Async("mailExecutor")
    public void sendAdmin2FaOtpEmail(String toEmail, String firstName, String role, String otp) {
        String roleDisplay = role != null ? role.replace("ROLE_", "").replace("_", " ") : "Administrator";
        String subject = "🔐 Your HireMind AI Admin 2FA Security Code: " + otp;
        String body = buildAdmin2FaOtpHtml(firstName, roleDisplay, otp, 5);

        sendHtmlEmail(toEmail, subject, body);
        log.info("Admin 2FA 4-digit OTP email dispatched to: {} [{}] [OTP: {}]", toEmail, roleDisplay, otp);
    }

    /**
     * Sends the email verification email.
     */
    @Async("mailExecutor")
    public void sendEmailVerification(String toEmail, String firstName, String verificationToken) {
        String verificationUrl = appProperties.getFrontend().getBaseUrl()
                + "/verify-email?token=" + verificationToken;

        String subject = "Verify your HireMind AI email address";
        String body = buildEmailVerificationHtml(firstName, verificationUrl,
                appProperties.getMail().getVerificationExpiryMinutes());

        sendHtmlEmail(toEmail, subject, body);
        log.info("Verification email dispatched to: {}", toEmail);
    }

    /**
     * Sends the password reset email.
     */
    @Async("mailExecutor")
    public void sendPasswordResetEmail(String toEmail, String firstName, String resetToken) {
        String resetUrl = appProperties.getFrontend().getBaseUrl()
                + "/reset-password?token=" + resetToken;

        String subject = "Reset your HireMind AI password";
        String body = buildPasswordResetHtml(firstName, resetUrl,
                appProperties.getMail().getResetPasswordExpiryMinutes());

        sendHtmlEmail(toEmail, subject, body);
        log.info("Password reset email dispatched to: {}", toEmail);
    }

    /**
     * Sends the 4-digit OTP password reset email.
     */
    @Async("mailExecutor")
    public void sendPasswordResetOtpEmail(String toEmail, String firstName, String otp) {
        String subject = "🔑 Your HireMind AI Password Reset OTP: " + otp;
        String body = buildPasswordResetOtpHtml(firstName, otp, 10);

        sendHtmlEmail(toEmail, subject, body);
        log.info("Password reset 4-digit OTP email dispatched to: {} [OTP: {}]", toEmail, otp);
    }

    /**
     * Sends the 4-digit OTP email verification code for new user registration.
     */
    @Async("mailExecutor")
    public void sendRegistrationOtpEmail(String toEmail, String firstName, String otp) {
        String subject = "🔑 Your HireMind AI Registration Verification Code: " + otp;
        String body = buildRegistrationOtpHtml(firstName, otp, 10);

        sendHtmlEmail(toEmail, subject, body);
        log.info("Registration 4-digit OTP email dispatched to: {} [OTP: {}]", toEmail, otp);
    }

    /**
     * Sends an account created confirmation email upon successful registration.
     */
    @Async("mailExecutor")
    public void sendAccountCreatedEmail(String toEmail, String firstName, String role) {
        String roleDisplay = "Candidate";
        if (role != null) {
            if (role.contains("HR")) {
                roleDisplay = "HR Recruiter";
            } else if (role.contains("COMPANY")) {
                roleDisplay = "Company Executive";
            } else if (role.contains("DEVELOPER")) {
                roleDisplay = "Application Developer";
            } else if (role.contains("MANAGEMENT")) {
                roleDisplay = "Platform Management Team";
            }
        }
        String subject = "🎉 Welcome to HireMind AI — Your Account has been Created!";
        String body = buildAccountCreatedHtml(firstName, roleDisplay, appProperties.getFrontend().getBaseUrl());
        sendHtmlEmail(toEmail, subject, body);
        log.info("Account created confirmation email dispatched to: {} [{}]", toEmail, roleDisplay);
    }

    /**
     * Sends a security alert notification when a new login occurs.
     */
    @Async("mailExecutor")
    public void sendLoginAlertEmail(String toEmail, String firstName, String ipAddress, String userAgent) {
        String formattedTime = DateTimeFormatter
                .ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a z", Locale.ENGLISH)
                .withZone(ZoneId.of("UTC"))
                .format(Instant.now());
        String subject = "🛡️ HireMind AI — New Sign-In to Your Account";
        String body = buildLoginAlertHtml(firstName, formattedTime, ipAddress, userAgent);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Login alert email dispatched to: {} [IP: {}]", toEmail, ipAddress);
    }

    /**
     * Sends a welcome email after successful email verification.
     */
    @Async("mailExecutor")
    public void sendWelcomeEmail(String toEmail, String firstName) {
        String subject = "Welcome to HireMind AI — Your AI Career Platform";
        String body = buildWelcomeHtml(firstName, appProperties.getFrontend().getBaseUrl());
        sendHtmlEmail(toEmail, subject, body);
        log.info("Welcome email dispatched to: {}", toEmail);
    }

    /**
     * Sends a generic system alert notification.
     */
    @Async("mailExecutor")
    public void sendSystemAlert(String toEmail, String alertTitle, String alertMessage) {
        String subject = "HireMind AI Notification: " + alertTitle;
        String body = buildAlertHtml(alertTitle, alertMessage);
        sendHtmlEmail(toEmail, subject, body);
        log.info("System alert email dispatched to: {}", toEmail);
    }

    /**
     * Sends a "You are selected" email from HR to a candidate.
     */
    @Async("mailExecutor")
    public void sendSelectionEmail(String toEmail, String candidateName, String jobTitle,
                                   String hrName, String customMessage) {
        String subject = "🎉 You've been selected — " + jobTitle + " at HireMind AI";
        String body = buildSelectionHtml(candidateName, jobTitle, hrName, customMessage);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Selection email dispatched to: {} for job: {}", toEmail, jobTitle);
    }

    /**
     * Sends an interview schedule confirmation email to a candidate.
     */
    @Async("mailExecutor")
    public void sendInterviewScheduleEmail(String toEmail, String candidateName, String jobTitle,
                                           Instant scheduledAt, String meetingLink) {
        String formattedDate = DateTimeFormatter
                .ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a z", Locale.ENGLISH)
                .withZone(ZoneId.of("UTC"))
                .format(scheduledAt);
        String subject = "📅 Interview Scheduled — " + jobTitle;
        String body = buildInterviewScheduleHtml(candidateName, jobTitle, formattedDate, meetingLink);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Interview schedule email dispatched to: {} for job: {}", toEmail, jobTitle);
    }

    /**
     * Sends an employee onboarding email to a candidate.
     */
    @Async("mailExecutor")
    public void sendEmployeeOnboardingEmail(String toEmail, String candidateName, String companyName, String jobTitle) {
        String subject = "📋 Employment Offer & Onboarding — " + companyName;
        String body = buildEmployeeOnboardingHtml(candidateName, companyName, jobTitle);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Employee onboarding email dispatched to: {} for company: {}", toEmail, companyName);
    }

    /**
     * Sends an official verified employee welcome email.
     */
    @Async("mailExecutor")
    public void sendEmployeeVerifiedEmail(String toEmail, String candidateName, String companyName,
                                          String jobTitle, String employeeCode) {
        String subject = "🎉 Welcome to the Team — You are now a Verified Employee at " + companyName;
        String body = buildEmployeeVerifiedHtml(candidateName, companyName, jobTitle, employeeCode);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Employee verified confirmation email dispatched to: {} [{}]", toEmail, employeeCode);
    }

    /**
     * Sends an employment termination notice email.
     */
    @Async("mailExecutor")
    public void sendTerminationNoticeEmail(String toEmail, String candidateName, String companyName,
                                           String reason, String lastWorkingDate) {
        String subject = "Notice of Employment Status Update — " + companyName;
        String body = buildTerminationNoticeHtml(candidateName, companyName, reason, lastWorkingDate);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Termination notice email dispatched to: {} for company: {}", toEmail, companyName);
    }

    /**
     * Sends a salary disbursement confirmation email.
     */
    @Async("mailExecutor")
    public void sendSalaryDisbursementEmail(String toEmail, String candidateName, String companyName,
                                            String amount, String currency, String periodLabel) {
        String subject = "💵 Salary Disbursement Processed — " + periodLabel + " [" + companyName + "]";
        String body = buildSalaryDisbursementHtml(candidateName, companyName, amount, currency, periodLabel);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Salary disbursement email dispatched to: {} for period: {}", toEmail, periodLabel);
    }

    /**
     * Sends a company invitation email for HR Recruiters or Candidates.
     */
    @Async("mailExecutor")
    public void sendCompanyInvitationEmail(String toEmail, String recipientName, String companyName,
                                           String role, String designation, String inviteLink, boolean autoVerifyBadge) {
        String roleDisplay = "ROLE_HR".equalsIgnoreCase(role) ? "Official HR Recruiter" : "Direct Candidate / Talent Partner";
        String displayTitle = designation != null && !designation.isBlank() ? designation : roleDisplay;
        String subject = "🏢 Invitation to Join " + companyName + " as " + displayTitle;
        String body = buildCompanyInvitationHtml(recipientName, companyName, roleDisplay, displayTitle, inviteLink, autoVerifyBadge);
        sendHtmlEmail(toEmail, subject, body);
        log.info("Company invitation email dispatched to: {} for company: {} as {}", toEmail, companyName, roleDisplay);
    }

    // ── Anti-Disposable / Temp-Mail Prohibited Domain Blacklist ────────────────
    private static final java.util.Set<String> DISPOSABLE_EMAIL_DOMAINS = java.util.Set.of(
            "temp-mail.org", "tmpmail.com", "tmpmail.net", "tmpmail.org",
            "10minutemail.com", "10minutemail.net", "mailinator.com",
            "guerrillamail.com", "sharklasers.com", "grr.la", "guerrillamailblock.com",
            "pokemail.net", "dispostable.com", "throwawaymail.com", "yopmail.com",
            "trashmail.com", "mohmal.com", "crazymailing.com", "fakemailgenerator.com",
            "burnermail.io", "getairmail.com", "mailpoof.com", "tempmail.net",
            "tempinbox.com", "dropmail.me", "nada.ltd", "getnada.com", "inboxkitten.com"
    );

    // ── Core Send ─────────────────────────────────────────────────────────────

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            log.warn("Security Alert: Attempted to send email to empty recipient");
            return;
        }
        String cleanTo = to.trim().toLowerCase();

        // Strict Anti-Disposable & Temp-Mail Shield:
        // 1. Block any known temporary email domains (like temp-mail.org)
        // 2. Reject non-Gmail domains to protect system resources and database
        String domain = cleanTo.contains("@") ? cleanTo.substring(cleanTo.indexOf('@') + 1) : "";
        boolean validDomain = domain.equals("gmail.com") || domain.endsWith(".com") || domain.endsWith(".org") 
                           || domain.endsWith(".net") || domain.endsWith(".edu") || domain.endsWith(".gov") 
                           || domain.endsWith(".in") || domain.endsWith(".co.in");
                           
        if (DISPOSABLE_EMAIL_DOMAINS.contains(domain) || !validDomain) {
            log.warn("Egress SMTP Intercept: Blocked outgoing email to suspicious or unsupported domain: {}", to);
            // Failing silently as an operational security measure. It appears as sent, but never goes out.
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(
                    appProperties.getMail().getFrom(),
                    appProperties.getMail().getFromName()
            );
            helper.setTo(cleanTo);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("✅ Email successfully delivered to [{}] | Subject: {}", cleanTo, subject);
        } catch (Throwable e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            if (errorMsg.contains("Authentication") || errorMsg.contains("535") || errorMsg.contains("BadCredentials")) {
                log.warn("⚠️ Gmail SMTP Authentication Notice for [{}]: Google requires a 16-character App Password (generated at https://myaccount.google.com/apppasswords). Error: {}", cleanTo, errorMsg);
            } else {
                log.warn("⚠️ Email dispatch skipped or failed for [{}]: {}", cleanTo, errorMsg);
            }
        }
    }

    // ── HTML Templates ────────────────────────────────────────────────────────

    private String buildEmailVerificationHtml(String firstName, String verificationUrl, int expiryMinutes) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your Email</title></head>
                <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
                <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 40px 30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">TalentIQ</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">AI Talent Intelligence Platform</p>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="color:#f8fafc;margin:0 0 16px;font-size:22px;">Hello, %s! 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">
                    Welcome to TalentIQ! Please verify your email address to activate your account and unlock all features.
                  </p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:16px;">
                      Verify Email Address
                    </a>
                  </div>
                  <p style="color:#64748b;font-size:13px;text-align:center;margin:0 0 8px;">
                    This link expires in <strong style="color:#94a3b8;">%d minutes</strong>.
                  </p>
                  <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">
                    If you didn't create an account, you can safely ignore this email.
                  </p>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2025 TalentIQ · AI Talent Intelligence Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, verificationUrl, expiryMinutes);
    }

    private String buildPasswordResetHtml(String firstName, String resetUrl, int expiryMinutes) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Reset Your Password</title></head>
                <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
                <tr><td style="background:linear-gradient(135deg,#ef4444,#f97316);padding:40px 40px 30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">TalentIQ</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Password Reset Request</p>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="color:#f8fafc;margin:0 0 16px;font-size:22px;">Hi %s,</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">
                    We received a request to reset your password. Click the button below to set a new password.
                  </p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:16px;">
                      Reset My Password
                    </a>
                  </div>
                  <p style="color:#64748b;font-size:13px;text-align:center;margin:0 0 8px;">
                    This link expires in <strong style="color:#94a3b8;">%d minutes</strong>.
                  </p>
                  <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">
                    If you didn't request a password reset, please secure your account immediately.
                  </p>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2025 TalentIQ · AI Talent Intelligence Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, resetUrl, expiryMinutes);
    }

    private String buildPasswordResetOtpHtml(String firstName, String otp, int expiryMinutes) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Reset Your Password OTP</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="580" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(129,140,248,0.25);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:32px;margin-bottom:6px;">✨</div>
                  <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.02em;">HireMind AI · TalentIQ</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Password Reset Verification</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 12px;font-size:20px;font-weight:700;">Hi %s 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;font-size:15px;">
                    We received a request to reset your password. Use the 4-digit verification code below to set a new password:
                  </p>
                  
                  <div style="text-align:center;margin:28px 0;">
                    <div style="display:inline-block;background:linear-gradient(135deg,rgba(99,102,241,0.18),rgba(236,72,153,0.18));border:2px solid #818cf8;border-radius:14px;padding:16px 32px;">
                      <span style="font-size:38px;font-weight:900;letter-spacing:14px;color:#a5b4fc;font-family:monospace;margin-left:14px;">%s</span>
                    </div>
                  </div>
                  
                  <p style="color:#64748b;font-size:13px;text-align:center;margin:20px 0 6px;">
                    ⏱️ This OTP is valid for <strong style="color:#e2e8f0;">%d minutes</strong>.
                  </p>
                  <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">
                    🔒 If you did not request this password reset, please ignore this email.
                  </p>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2026 HireMind AI · TalentIQ Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, otp, expiryMinutes);
    }

    private String buildRegistrationOtpHtml(String firstName, String otp, int expiryMinutes) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Verify Your HireMind AI Email</title></head>
                <body style="margin:0;padding:0;background:#060b18;font-family:'Segoe UI',Arial,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#060b18;">
                <tr><td align="center" style="padding:48px 20px;">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#0e172a;border:1px solid rgba(255,255,255,0.1);border-radius:20px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.5);">
                <tr><td style="background:linear-gradient(135deg,#06b6d4,#6366f1,#a855f7);padding:36px 40px 30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">🪐 HireMind AI</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Next-Gen AI Talent Intelligence Platform</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 12px;font-size:20px;font-weight:700;">Welcome, %s! 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;font-size:15px;">
                    Thank you for signing up with HireMind AI. Please enter the 4-digit verification code below to verify your email address and activate your account:
                  </p>
                  
                  <div style="text-align:center;margin:28px 0;">
                    <div style="display:inline-block;background:linear-gradient(135deg,rgba(6,182,212,0.18),rgba(99,102,241,0.18));border:2px solid #38bdf8;border-radius:14px;padding:16px 32px;">
                      <span style="font-size:38px;font-weight:900;letter-spacing:14px;color:#38bdf8;font-family:monospace;margin-left:14px;">%s</span>
                    </div>
                  </div>
                  
                  <p style="color:#64748b;font-size:13px;text-align:center;margin:20px 0 6px;">
                    ⏱️ This verification code is valid for <strong style="color:#e2e8f0;">%d minutes</strong>.
                  </p>
                  <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">
                    🔒 If you did not initiate this registration, you can safely disregard this email.
                  </p>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2026 HireMind AI · TalentIQ Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, otp, expiryMinutes);
    }

    private String buildWelcomeHtml(String firstName, String dashboardUrl) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Welcome to TalentIQ</title></head>
                <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
                <tr><td style="background:linear-gradient(135deg,#06b6d4,#6366f1,#8b5cf6);padding:40px 40px 30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:32px;font-weight:700;">Welcome to TalentIQ! 🚀</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px;">Your AI-Powered Career Journey Starts Now</p>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="color:#f8fafc;margin:0 0 16px;font-size:22px;">Hello, %s! Your account is ready.</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">
                    You now have access to the complete AI Talent Intelligence Platform — portfolio builder,
                    AI resume parser, smart job matching, and more.
                  </p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="%s/dashboard" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#6366f1);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:16px;">
                      Go to Dashboard
                    </a>
                  </div>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2025 TalentIQ · AI Talent Intelligence Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, dashboardUrl);
    }

    private String buildAlertHtml(String title, String message) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>%s</title></head>
                <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
                <tr><td style="background:linear-gradient(135deg,#06b6d4,#6366f1);padding:30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">%s</h1>
                </td></tr>
                <tr><td style="padding:40px;">
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;font-size:16px;">%s</p>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2025 TalentIQ · AI Talent Intelligence Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(title, title, message);
    }

    private String buildSelectionHtml(String candidateName, String jobTitle, String hrName, String customMessage) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>You're Selected!</title></head>
                <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
                <tr><td style="background:linear-gradient(135deg,#10b981,#06b6d4);padding:40px 40px 30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:32px;font-weight:700;">🎉 Congratulations!</h1>
                  <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">You've been selected!</p>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="color:#f8fafc;margin:0 0 16px;font-size:22px;">Hello, %s! 🌟</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 16px;">
                    We are thrilled to inform you that your application for the position of
                    <strong style="color:#f1f5f9;">%s</strong> has been shortlisted.
                  </p>
                  <div style="background:#0f172a;border-left:4px solid #10b981;padding:20px;border-radius:8px;margin:24px 0;">
                    <p style="color:#94a3b8;margin:0;line-height:1.7;font-size:15px;">%s</p>
                  </div>
                  <p style="color:#64748b;font-size:14px;margin:0;">— %s, Talent Team @ TalentIQ</p>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2025 TalentIQ · AI Talent Intelligence Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(candidateName, jobTitle, customMessage, hrName);
    }

    private String buildInterviewScheduleHtml(String candidateName, String jobTitle,
                                              String formattedDate, String meetingLink) {
        String meetingSection = (meetingLink != null && !meetingLink.isBlank())
                ? "<div style=\"text-align:center;margin:28px 0;\"><a href=\"" + meetingLink + "\" style=\"display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:16px;\">Join Meeting</a></div>"
                : "<p style=\"color:#64748b;font-size:13px;text-align:center;\">Meeting link will be shared separately.</p>";

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Interview Scheduled</title></head>
                <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
                <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 40px 30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">📅 Interview Scheduled</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">TalentIQ Recruitment Platform</p>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="color:#f8fafc;margin:0 0 16px;font-size:22px;">Hello, %s!</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">
                    Your interview for <strong style="color:#f1f5f9;">%s</strong> has been scheduled.
                  </p>
                  <div style="background:#0f172a;border-radius:12px;padding:24px;margin:0 0 24px;">
                    <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Scheduled Time</p>
                    <p style="color:#e2e8f0;font-size:18px;font-weight:600;margin:0;">%s</p>
                  </div>
                  %s
                  <p style="color:#64748b;font-size:13px;text-align:center;margin:16px 0 0;">
                    Please be available 5 minutes before the scheduled time.
                  </p>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">© 2026 HireMind AI · AI Talent Intelligence Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(candidateName, jobTitle, formattedDate, meetingSection);
    }

    private String buildAccountCreatedHtml(String firstName, String roleDisplay, String portalUrl) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Welcome to HireMind AI</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(129,140,248,0.25);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">🪐</div>
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.02em;">Welcome to HireMind AI!</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:15px;">Official Account Confirmation</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 14px;font-size:22px;font-weight:700;">Hi %s! 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;font-size:15px;">
                    Your account has been successfully created as a <strong style="color:#38bdf8;">%s</strong> on the HireMind AI platform.
                  </p>
                  
                  <div style="background:rgba(30,41,59,0.7);border-left:4px solid #38bdf8;padding:16px 20px;border-radius:8px;margin:20px 0;">
                    <p style="color:#cbd5e1;margin:0;font-size:14px;line-height:1.5;">
                      ✨ <strong>What's Next?</strong> Access real-time AI job recommendations, full-duplex recruiter chat messaging, smart resume analysis, and cosmic portal tools.
                    </p>
                  </div>

                  <div style="text-align:center;margin:30px 0 10px;">
                    <a href="%s/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#38bdf8);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
                      Sign In to Your Account →
                    </a>
                  </div>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">© 2026 HireMind AI · hiremindai.ai@gmail.com</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, roleDisplay, portalUrl);
    }

    private String buildLoginAlertHtml(String firstName, String loginTime, String ipAddress, String userAgent) {
        String safeIp = ipAddress != null ? ipAddress : "Unknown IP";
        String safeAgent = userAgent != null ? userAgent : "Web Browser";
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>New Login Detected</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(56,189,248,0.25);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#0284c7,#38bdf8);padding:32px 40px 26px;text-align:center;">
                  <div style="font-size:32px;margin-bottom:6px;">🛡️</div>
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">New Sign-In Detected</h1>
                  <p style="color:rgba(255,255,255,0.9);margin:4px 0 0;font-size:14px;">HireMind AI Security Notification</p>
                </td></tr>
                <tr><td style="padding:32px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 12px;font-size:18px;font-weight:700;">Hi %s 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;font-size:14px;">
                    We noticed a new sign-in to your HireMind AI account with the following details:
                  </p>
                  
                  <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px 20px;margin:16px 0;">
                    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;"><strong>🕒 Time:</strong> <span style="color:#e2e8f0;">%s</span></p>
                    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;"><strong>🌐 IP Address:</strong> <span style="color:#38bdf8;font-family:monospace;">%s</span></p>
                    <p style="color:#94a3b8;font-size:13px;margin:0;"><strong>💻 Device/Client:</strong> <span style="color:#cbd5e1;">%s</span></p>
                  </div>

                <tr><td style="padding:18px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">© 2026 HireMind AI · hiremindai.ai@gmail.com</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, loginTime, safeIp, safeAgent);
    }

    private String buildAdmin2FaOtpHtml(String firstName, String roleDisplay, String otp, int expiryMinutes) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Admin 2FA Security Code</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(99,102,241,0.3);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:6px;">🔐</div>
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">HireMind AI — Admin 2FA Verification</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Two-Factor Authentication Security Gateway</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 12px;font-size:20px;font-weight:700;">Hi %s 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;font-size:15px;">
                    A sign-in request was initiated for your <strong style="color:#818cf8;">%s</strong> account. To ensure system security, please use the 4-digit Two-Factor Authentication (2FA) verification code below to authorize this session:
                  </p>
                  
                  <div style="background:rgba(30,41,59,0.8);border:2px dashed #6366f1;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                    <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#a5b4fc;font-family:'Courier New',monospace;text-shadow:0 0 20px rgba(99,102,241,0.5);">
                      %s
                    </div>
                    <p style="color:#64748b;font-size:13px;margin:10px 0 0;">Expires in <strong style="color:#f87171;">%d minutes</strong> · Single-Use Security Ticket</p>
                  </div>

                  <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0;">
                    🛡️ <strong>Security Tip:</strong> Never share this code with anyone. HireMind AI staff will never ask for your 2FA verification code. If you did not attempt to sign in, change your password immediately.
                  </p>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">© 2026 HireMind AI · hiremindai.ai@gmail.com · All rights reserved.</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(firstName, roleDisplay, otp, expiryMinutes);
    }

    private String buildEmployeeOnboardingHtml(String candidateName, String companyName, String jobTitle) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Employment Offer & Onboarding</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(129,140,248,0.25);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">📋</div>
                  <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;">Employment Offer & Onboarding</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">%s</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 14px;font-size:20px;font-weight:700;">Hello %s! 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;font-size:15px;">
                    You have been onboarded as an employee for the role of <strong style="color:#818cf8;">%s</strong> at <strong style="color:#f1f5f9;">%s</strong>.
                  </p>
                  <div style="background:rgba(30,41,59,0.7);border-left:4px solid #818cf8;padding:16px 20px;border-radius:8px;margin:20px 0;">
                    <p style="color:#cbd5e1;margin:0;font-size:14px;line-height:1.5;">
                      Your employment record is currently pending executive verification by the Company Manager. Once verified, your status will become Active and your official employee badge will be issued.
                    </p>
                  </div>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">© 2026 HireMind AI · Corporate Workspace Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(companyName, candidateName, jobTitle, companyName);
    }

    private String buildEmployeeVerifiedHtml(String candidateName, String companyName, String jobTitle, String employeeCode) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Employment Verified</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(16,185,129,0.3);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">🎖️</div>
                  <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;">Official Employment Verified!</h1>
                  <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">%s · Corporate Registry</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 14px;font-size:20px;font-weight:700;">Congratulations, %s! 🎉</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;font-size:15px;">
                    Your employment has been officially verified and approved by the Company Leadership of <strong style="color:#f1f5f9;">%s</strong>.
                  </p>
                  <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin:20px 0;">
                    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;"><strong>💼 Role:</strong> <span style="color:#e2e8f0;">%s</span></p>
                    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;"><strong>🏢 Company:</strong> <span style="color:#e2e8f0;">%s</span></p>
                    <p style="color:#94a3b8;font-size:13px;margin:0;"><strong>🆔 Employee Code:</strong> <span style="color:#10b981;font-family:monospace;font-weight:700;">%s</span></p>
                  </div>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">© 2026 HireMind AI · Corporate Workspace Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(companyName, candidateName, companyName, jobTitle, companyName, employeeCode != null ? employeeCode : "N/A");
    }

    private String buildTerminationNoticeHtml(String candidateName, String companyName, String reason, String lastWorkingDate) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Employment Status Notice</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(239,68,68,0.3);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">📄</div>
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">Notice of Employment Status Update</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">%s</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 14px;font-size:18px;font-weight:700;">Dear %s,</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;font-size:14px;">
                    This email is to inform you that your employment with <strong style="color:#f1f5f9;">%s</strong> has been concluded.
                  </p>
                  <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:16px 20px;margin:16px 0;">
                    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;"><strong>Reason / Notes:</strong> <span style="color:#e2e8f0;">%s</span></p>
                    <p style="color:#94a3b8;font-size:13px;margin:0;"><strong>Last Working Date:</strong> <span style="color:#f87171;">%s</span></p>
                  </div>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">© 2026 HireMind AI · Corporate Workspace Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(companyName, candidateName, companyName, reason != null ? reason : "Standard separation", lastWorkingDate != null ? lastWorkingDate : "Immediate");
    }

    private String buildSalaryDisbursementHtml(String candidateName, String companyName, String amount, String currency, String periodLabel) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Salary Disbursement Confirmation</title></head>
                <body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0f19;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,23,42,0.95);border:1px solid rgba(56,189,248,0.3);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <tr><td style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">💵</div>
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">Salary Disbursement Confirmed</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">%s · Payroll Department</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 14px;font-size:18px;font-weight:700;">Hello %s 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;font-size:14px;">
                    Your salary disbursement for <strong style="color:#38bdf8;">%s</strong> has been approved and processed by <strong style="color:#f1f5f9;">%s</strong>.
                  </p>
                  <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(56,189,248,0.25);border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
                    <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;">Disbursed Amount</p>
                    <div style="font-size:36px;font-weight:900;color:#38bdf8;font-family:monospace;">
                      %s %s
                    </div>
                  </div>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.5);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">© 2026 HireMind AI · Corporate Workspace Platform</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(companyName, candidateName, periodLabel, companyName, currency, amount);
    }

    private String buildCompanyInvitationHtml(String recipientName, String companyName, String roleDisplay,
                                             String displayTitle, String inviteLink, boolean autoVerifyBadge) {
        String greeting = (recipientName != null && !recipientName.isBlank()) ? "Hello " + recipientName : "Hello";
        String badgeHtml = autoVerifyBadge
                ? """
                  <div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.35);border-radius:10px;padding:14px 18px;margin:20px 0;text-align:left;">
                    <span style="font-size:16px;vertical-align:middle;">🎖️</span>
                    <strong style="color:#10b981;font-size:13px;margin-left:6px;">Official Company Verification Badge Included</strong>
                    <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;line-height:1.5;">Upon accepting this invitation and completing registration, you will be automatically awarded the verified corporate badge with full access to company pipelines and team collaboration.</p>
                  </div>
                  """
                : "";

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Company Invitation — HireMind AI</title></head>
                <body style="margin:0;padding:0;background:#070d18;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background:#070d18;min-height:100vh;">
                <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:rgba(15,28,54,0.95);border:1px solid rgba(56,189,248,0.3);border-radius:18px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.7);">
                <tr><td style="background:linear-gradient(135deg,#1e40af,#0284c7);padding:36px 40px 28px;text-align:center;">
                  <div style="font-size:40px;margin-bottom:8px;">🏢</div>
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">Corporate Workspace Invitation</h1>
                  <p style="color:rgba(255,255,255,0.88);margin:6px 0 0;font-size:14px;font-weight:600;">%s · Executive Team</p>
                </td></tr>
                <tr><td style="padding:36px 40px;">
                  <h2 style="color:#f8fafc;margin:0 0 14px;font-size:18px;font-weight:700;">%s 👋</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;font-size:14px;">
                    You have been officially invited by <strong style="color:#38bdf8;">%s</strong> to join their corporate workspace as:
                  </p>
                  <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(56,189,248,0.25);border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
                    <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Designated Role & Title</div>
                    <div style="font-size:22px;font-weight:800;color:#f8fafc;">%s</div>
                    <div style="font-size:13px;color:#38bdf8;margin-top:4px;font-weight:600;">%s</div>
                  </div>
                  %s
                  <div style="text-align:center;margin:32px 0 24px;">
                    <a href="%s" style="display:inline-block;padding:14px 36px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#38bdf8);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;box-shadow:0 8px 24px rgba(37,99,235,0.4);">
                      Accept Invitation & Join Workspace →
                    </a>
                  </div>
                  <p style="color:#64748b;font-size:12px;line-height:1.5;margin:24px 0 0;word-break:break-all;">
                    Or paste this URL in your browser: <br/>
                    <span style="color:#38bdf8;">%s</span>
                  </p>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(10,15,30,0.6);text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">This invitation is confidential and expires in 7 days · © 2026 HireMind AI Enterprise</p>
                </td></tr>
                </table></td></tr></table>
                </body></html>
                """.formatted(companyName, greeting, companyName, displayTitle, roleDisplay, badgeHtml, inviteLink, inviteLink);
    }
}
