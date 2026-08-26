package com.talentiq.security.email;

import com.talentiq.common.enums.Role;
import com.talentiq.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.naming.NamingEnumeration;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Set;

/**
 * Enterprise Email Security & Anti-Disposable Email Validator.
 * Protects against fake temporary email generators (such as temp-mail.org, 10minutemail, etc.).
 */
@Component
@Slf4j
public class EmailSecurityValidator {

    // Comprehensive list of disposable/temporary email provider domains & known alias domains
    private static final Set<String> DISPOSABLE_DOMAINS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            // Popular temp mail generators & temp-mail.org aliases
            "temp-mail.org", "temp-mail.io", "temp-mail.ru", "temp-mail.net", "temp-mail.de",
            "tempmail.com", "tempmail.net", "tempmail.dev", "tempmail.io", "tempmailo.com",
            "tmpmail.com", "tmpmail.net", "tmpmail.org", "tmpmail.pw",
            "10minutemail.com", "10minutemail.net", "10minemail.com", "10minutemail.org", "10mail.org",
            "mailinator.com", "mailinator.net", "mailinator2.com", "mailin8r.com",
            "guerrillamail.com", "guerrillamail.org", "guerrillamail.net", "guerrillamail.biz",
            "guerrillamailblock.com", "sharklasers.com", "grr.la", "pokemail.net", "spam4.me",
            "dispostable.com", "throwawaymail.com", "throwaway.email", "disposablemail.com",
            "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc",
            "trashmail.com", "trashmail.net", "trashmail.org", "trashmail.me", "trash-mail.com",
            "mohmal.com", "mohmal.in", "mohmal.im", "crazymailing.com", "fakemailgenerator.com",
            "burnermail.io", "burner.email", "getairmail.com", "mailpoof.com", "tempinbox.com",
            "dropmail.me", "nada.ltd", "getnada.com", "inboxkitten.com", "inboxbear.com",
            "fextemp.com", "vewku.com", "vwhins.com", "armyspy.com", "cuvox.de", "dayrep.com",
            "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com",
            "teleworm.us", "emailfake.com", "generator.email", "zillamail.com", "mytemp.email",
            "tempail.com", "emailondeck.com", "minutemailbox.com", "mailcatch.com", "mytempemail.com",
            "tmailor.com", "tempm.com", "tempmailaddress.com", "fakemail.net", "tempmailgen.com",
            "boun.cr", "chacuo.net", "0815.ru", "0-mail.com", "10mail.com", "20minutemail.com",
            "33mail.com", "anonbox.net", "antichef.com", "binkmail.com", "bobmail.info",
            "byom.de", "cachedot.net", "correo.blogos.net", "cosmorph.com", "courrieltemporaire.com",
            "deadaddress.com", "despam.it", "dontreg.com", "drdrb.net", "dumpmail.de",
            "e4ward.com", "email-temporaire.fr", "emailthe.net", "emeil.in", "eyepaste.com",
            "fakeinbox.com", "fastchems.com", "filzmail.com", "garbagemail.org", "gishpuppy.com",
            "haltospam.com", "harakirimail.com", "incognitomail.org", "jetable.org", "kasmail.com",
            "kaspop.com", "klzlk.com", "letthemeatspam.com", "lifebyfood.com", "lookugly.com",
            "maboard.com", "mail-temporaire.fr", "mailblocks.com", "maileater.com",
            "mailexpire.com", "mailforspam.com", "mailmoat.com", "mailnull.com", "mailshell.com"
    )));

    // Keywords that strongly indicate disposable temporary email services
    private static final Set<String> DISPOSABLE_KEYWORDS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "temp-mail", "tempmail", "tmpmail", "10minute", "10min", "disposable", "throwaway",
            "trashmail", "fakemail", "burnermail", "fakeinbox", "guerrilla", "mailinator",
            "yopmail", "sharklaser", "mohmal", "dropmail", "getnada", "inboxkitten", "emailfake",
            "generator.email", "zillamail", "fextemp", "vewku", "vwhins", "teleworm", "armyspy",
            "superrito", "dayrep", "jourrapide", "cuvox", "fleckens", "gustr"
    )));

    /**
     * Validates an email address against platform security policies.
     * Throws BadRequestException if validation fails.
     */
    public void validateEmailSecurity(String email, Role role) {
        if (!StringUtils.hasText(email)) {
            throw new BadRequestException("Email address is required.");
        }
        String clean = email.trim().toLowerCase();

        // Immediate hard block for temp-mail.org and all disposable mail generators
        if (clean.contains("temp-mail.org") || clean.contains("temp-mail") || clean.contains("tempmail") || clean.contains("10minutemail")) {
            log.warn("🛡️ Security Guard: Hard-blocked temporary mail generator request: {}", clean);
            throw new BadRequestException("🚫 Security Policy Alert: Temporary, disposable, and fake email generators (such as https://temp-mail.org) are strictly blocked. OTP will not be generated or sent.");
        }

        if (!clean.contains("@") || clean.indexOf('@') != clean.lastIndexOf('@')) {
            throw new BadRequestException("Please enter a valid email address format.");
        }

        String localPart = clean.substring(0, clean.indexOf('@'));
        String domain = clean.substring(clean.indexOf('@') + 1);

        if (localPart.length() < 3) {
            throw new BadRequestException("Email username must be at least 3 characters long.");
        }

        // 1. Anti-Disposable & Temp-Mail Shield (Globally enforced)
        if (isDisposableDomain(domain)) {
            log.warn("🛡️ Security Guard: Blocked disposable / temporary email domain: {}", clean);
            throw new BadRequestException("🚫 Security Policy Alert: Temporary, disposable, and fake email generators (such as temp-mail.org) are strictly prohibited.");
        }

        // 2. Role-Based Domain Policy
        if (role == Role.ROLE_CANDIDATE || role == Role.ROLE_HR) {
            // Candidate & HR: Strictly @gmail.com
            if (!domain.equals("gmail.com")) {
                log.warn("🛡️ Security Guard: Blocked non-Gmail domain for User/HR: {}", clean);
                throw new BadRequestException("🔒 Security Policy: Only official @gmail.com email addresses are permitted for HR and Candidates.");
            }
        } else {
            // Admin roles OR unspecified role (null): allow standard verified corporate/institutional TLDs
            boolean validTld = domain.endsWith(".com") || domain.endsWith(".org") || domain.endsWith(".net")
                    || domain.endsWith(".edu") || domain.endsWith(".gov") || domain.endsWith(".in")
                    || domain.endsWith(".co.in") || domain.endsWith(".io") || domain.endsWith(".ai");

            if (!validTld) {
                log.warn("🛡️ Security Guard: Blocked unsupported domain extension: {}", clean);
                throw new BadRequestException("🔒 Security Policy: Accounts must use verified corporate, institutional, or service domains (.com, .org, .net, .edu, .gov, .in, .co.in, .io, .ai).");
            }
        }
    }

    /**
     * Checks if a domain is a known disposable or suspicious temporary email domain.
     */
    public boolean isDisposableDomain(String domain) {
        if (!StringUtils.hasText(domain)) return true;
        String cleanDomain = domain.trim().toLowerCase();

        // Exact match in blacklist
        if (DISPOSABLE_DOMAINS.contains(cleanDomain)) {
            return true;
        }

        // Check if any sub-domain belongs to disposable list
        for (String disp : DISPOSABLE_DOMAINS) {
            if (cleanDomain.endsWith("." + disp)) {
                return true;
            }
        }

        // Keyword check in domain name
        for (String keyword : DISPOSABLE_KEYWORDS) {
            if (cleanDomain.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Checks whether a domain has valid DNS MX (Mail Exchange) records.
     * Fails open if DNS lookups are unavailable in local dev/offline environments.
     */
    public boolean hasValidMxRecord(String domain) {
        if (!StringUtils.hasText(domain)) return false;
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "1500");
            env.put("com.sun.jndi.dns.timeout.retries", "1");
            DirContext ictx = new InitialDirContext(env);
            Attributes attrs = ictx.getAttributes(domain, new String[]{"MX"});
            Attribute attr = attrs.get("MX");
            return attr != null && attr.size() > 0;
        } catch (Exception e) {
            // In dev environment or during test execution without internet, log debug and allow standard domains
            log.debug("DNS MX lookup skipped/fallback for domain {}: {}", domain, e.getMessage());
            return true;
        }
    }
}
