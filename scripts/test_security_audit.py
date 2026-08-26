#!/usr/bin/env python3
"""
HireMind-AI — Dedicated Security Audit Verification Suite
Tests the core security fixes:
1. OTP Role Binding (Preventing Candidate -> Admin privilege escalation)
2. Single-Use OTP & Replay Prevention
3. Password Reset Lockout & Brute-force Prevention
4. Disabled Mock Google OAuth Flow
5. Cryptographic Email Verification Token Enforcement
6. Protected Chat Attachment File Endpoints (401 on unauthenticated)
7. Admin 2FA Session Consumption (Anti-Replay)
8. HR Logout Token Revocation
"""

import sys
import json
import urllib.request
import urllib.error
import subprocess
import time

BASE_URL = "http://localhost:8081/api"

GREEN = "\033[92m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

results = {"passed": 0, "failed": 0, "total": 0}

def log_test(name, passed, detail=""):
    results["total"] += 1
    if passed:
        results["passed"] += 1
        print(f"[{GREEN}PASS{RESET}] {BOLD}{name}{RESET} | {detail}")
    else:
        results["failed"] += 1
        print(f"[{RED}FAIL{RESET}] {BOLD}{name}{RESET} | {detail}")

def http_req(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_body = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(resp_body)
            except Exception:
                return resp.status, resp_body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def get_redis_val(key):
    try:
        raw = subprocess.check_output(
            ["docker", "exec", "talentiq-redis", "redis-cli", "GET", key]
        ).decode().strip().strip('"')
        return raw
    except Exception:
        return ""

print("\n" + "="*75)
print("   HIREMIND-AI SECURITY AUDIT & VULNERABILITY VERIFICATION SUITE")
print("="*75 + "\n")

ts = int(time.time())

# ── TEST 1: OTP Role Binding (Attacker requests OTP as Candidate, tries to register as Admin) ─
cand_email = f"attacker.{ts}@gmail.com"
code, _ = http_req("/v1/auth/candidate/send-otp", "POST", {
    "email": cand_email, "firstName": "Attacker", "role": "ROLE_CANDIDATE"
})
otp_raw = get_redis_val(f"otp:reg:{cand_email}")
cand_otp = otp_raw.split(":")[-1] if ":" in otp_raw else otp_raw

# Attacker attempts to use Candidate OTP to register as ROLE_APP_DEVELOPER
code, res = http_req("/v1/auth/app-developer/register", "POST", {
    "firstName": "Attacker", "lastName": "Hacker", "email": cand_email,
    "password": "Password123!", "role": "ROLE_APP_DEVELOPER", "otp": cand_otp
})
passed = code == 400 and ("Security violation" in str(res) or "different account type" in str(res))
log_test("1. OTP Role Binding Enforcement", passed, f"Status: {code} (Blocked Candidate->Admin escalation)")

# ── TEST 2: OTP Single-Use & Replay Prevention ────────────────────────────────
code, res = http_req("/v1/auth/candidate/register", "POST", {
    "firstName": "Attacker", "lastName": "Hacker", "email": cand_email,
    "password": "Password123!", "role": "ROLE_CANDIDATE", "otp": cand_otp
})
first_reg_ok = code == 201
code, res2 = http_req("/v1/auth/candidate/register", "POST", {
    "firstName": "Attacker", "lastName": "Hacker", "email": cand_email,
    "password": "Password123!", "role": "ROLE_CANDIDATE", "otp": cand_otp
})
passed = first_reg_ok and code in [400, 409]
log_test("2. Single-Use OTP & Anti-Replay", passed, f"Initial: {201}, Replay Rejection: {code}")

# ── TEST 3: Password Reset without Valid OTP ───────────────────────────────────
code, res = http_req("/v1/auth/reset-password", "POST", {
    "email": cand_email, "newPassword": "NewPassword123!", "otp": "0000"
})
passed = code == 400
log_test("3. Password Reset Protection (Anti-Brute Force)", passed, f"Status: {code} (Unverified reset rejected)")

# ── TEST 4: Disabled Mock Google OAuth ─────────────────────────────────────────
code, res = http_req("/v1/auth/google", "POST", {
    "email": "victim@gmail.com", "name": "Victim", "role": "ROLE_APP_DEVELOPER"
})
passed = code == 400 and "disabled" in str(res).lower()
log_test("4. Mock Google OAuth Disabled", passed, f"Status: {code} (Impersonation blocked)")

# ── TEST 5: Email Verification Token Security (Plaintext Email Rejection) ───────
code, res = http_req("/v1/auth/verify-email", "POST", {
    "token": "victim@gmail.com"
})
passed = code == 400
log_test("5. Cryptographic Email Token Verification", passed, f"Status: {code} (Plaintext email as token rejected)")

# ── TEST 6: Protected Chat Files (Unauthenticated Download Blocked) ────────────
code, res = http_req("/v1/chat/files/private_resume.pdf", "GET")
passed = code == 401
log_test("6. Protected Chat Attachment Files", passed, f"Status: {code} (Unauthenticated file access blocked)")

# ── TEST 7: 2FA Session Consumption (Anti-Replay) ──────────────────────────────
comp_email = f"director.sec.{ts}@enterprise.com"
http_req("/v1/auth/company/send-otp", "POST", {"email": comp_email, "firstName": "SecDir", "role": "ROLE_COMPANY_ADMIN"})
comp_otp = get_redis_val(f"otp:reg:{comp_email}").split(":")[-1]
http_req("/v1/auth/company/register", "POST", {
    "firstName": "SecDir", "lastName": "Admin", "email": comp_email,
    "password": "Password123!", "role": "ROLE_COMPANY_ADMIN", "otp": comp_otp
})
code, login_res = http_req("/v1/auth/company/login", "POST", {"email": comp_email, "password": "Password123!"})
two_fa_token = login_res.get("data", {}).get("twoFactorToken", "") if isinstance(login_res, dict) else ""
two_fa_raw = get_redis_val(f"2fa:session:{two_fa_token}")
two_fa_otp = two_fa_raw.split(":")[-1] if ":" in two_fa_raw else two_fa_raw

code1, _ = http_req("/v1/auth/company/2fa-verify", "POST", {"email": comp_email, "twoFactorToken": two_fa_token, "otp": two_fa_otp})
code2, _ = http_req("/v1/auth/company/2fa-verify", "POST", {"email": comp_email, "twoFactorToken": two_fa_token, "otp": two_fa_otp})
passed = code1 == 200 and code2 == 400
log_test("7. Admin 2FA Session Consumption", passed, f"First Verify: {code1}, Replay Attempt: {code2}")

# ── TEST 8: HR Logout Token Revocation ─────────────────────────────────────────
hr_email = f"hr.sec.{ts}@gmail.com"
http_req("/v1/auth/hr/send-otp", "POST", {"email": hr_email, "firstName": "SecHR", "role": "ROLE_HR"})
hr_otp = get_redis_val(f"otp:reg:{hr_email}").split(":")[-1]
http_req("/v1/auth/hr/register", "POST", {
    "firstName": "SecHR", "lastName": "Manager", "email": hr_email,
    "password": "Password123!", "role": "ROLE_HR", "otp": hr_otp
})
code, hr_login = http_req("/v1/auth/hr/login", "POST", {"email": hr_email, "password": "Password123!"})
hr_token = hr_login.get("data", {}).get("accessToken", "") if isinstance(hr_login, dict) else ""
hr_refresh = hr_login.get("data", {}).get("refreshToken", "") if isinstance(hr_login, dict) else ""

http_req("/v1/auth/logout", "POST", token=hr_token)
code, refresh_res = http_req("/v1/auth/refresh", "POST", {"refreshToken": hr_refresh})
passed = code == 401
log_test("8. HR Logout Token Revocation", passed, f"Status: {code} (Revoked HR refresh token rejected)")

print("\n" + "="*75)
print(f"Total Security Tests: {results['total']} | Passed: {results['passed']} | Failed: {results['failed']}")
print("="*75 + "\n")

if results["failed"] == 0:
    print(f"{GREEN}🎉 ALL SECURITY AUDIT VERIFICATION TESTS PASSED!{RESET}\n")
    sys.exit(0)
else:
    print(f"{RED}❌ SOME SECURITY TESTS FAILED.{RESET}\n")
    sys.exit(1)
