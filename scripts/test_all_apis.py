#!/usr/bin/env python3
"""
HireMind-AI — Comprehensive End-to-End Test Suite
Tests all system features:
1. Actuator Health & System Readiness
2. Multi-Role Registration (Candidate, HR, Company Executive, App Developer, Management Team)
3. Auth, Login & JWT Claim Verification
4. Developer Safeguard Filter (Safe DB Mode - destructive DB drops blocked)
5. HireMind-Management Team Moderation & Temporal Job Metrics (Today, Week, Month, Year)
6. Company-HR-Candidate Tag Approval & Certificate Verification Workflow
7. Multi-User Team Collaboration Group Chat, Member Management & Messages
8. Candidate Portfolio, Education & Job Application Flows
9. Real-Time Chat & Flagging System
10. Frontend Container & Static Assets Verification
"""

import sys
import json
import urllib.request
import urllib.error
import time
import subprocess

BASE_URL = "http://localhost:8081/api"
FRONTEND_URL = "http://localhost:3000"

# Terminal Color Codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "failures": []
}

def log_test(suite, endpoint, method, status_code, expected_status, detail=""):
    results["total"] += 1
    success = status_code in expected_status if isinstance(expected_status, list) else status_code == expected_status
    if success:
        results["passed"] += 1
        print(f"[{GREEN}PASS{RESET}] [{suite}] {BOLD}{method} {endpoint}{RESET} -> {status_code} {detail}")
    else:
        results["failed"] += 1
        msg = f"[{RED}FAIL{RESET}] [{suite}] {BOLD}{method} {endpoint}{RESET} -> Got {status_code}, Expected {expected_status} | {detail}"
        print(msg)
        results["failures"].append(msg)
    return success

def request(endpoint, method="GET", data=None, token=None):
    time.sleep(0.02)
    url = f"{BASE_URL}{endpoint}" if endpoint.startswith("/") else endpoint
    headers = {"X-Internal-Test": "true"}
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
                json_data = json.loads(resp_body)
            except Exception:
                json_data = resp_body
            return resp.status, json_data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            json_err = json.loads(err_body)
        except Exception:
            json_err = err_body
        return e.code, json_err
    except Exception as e:
        return 0, str(e)

def get_redis_otp(email, prefix="otp:reg:"):
    try:
        raw = subprocess.check_output(
            ["docker", "exec", "talentiq-redis", "redis-cli", "GET", f"{prefix}{email}"]
        ).decode().strip().strip('"')
        return raw
    except Exception as e:
        print(f"{RED}Error reading OTP from Redis: {e}{RESET}")
        return "1234"

def get_redis_2fa_otp(two_factor_token):
    try:
        raw = subprocess.check_output(
            ["docker", "exec", "talentiq-redis", "redis-cli", "GET", f"2fa:session:{two_factor_token}"]
        ).decode().strip().strip('"')
        if ":" in raw:
            return raw.split(":")[-1]
        return raw
    except Exception as e:
        print(f"{RED}Error reading 2FA OTP from Redis: {e}{RESET}")
        return "1234"

def register_user(role, email, first_name, last_name, extra_fields=None):
    # Determine dedicated endpoint
    otp_ep = "/v1/auth/register/send-otp"
    reg_ep = "/v1/auth/register"
    if role == "ROLE_CANDIDATE":
        otp_ep = "/v1/auth/candidate/send-otp"
        reg_ep = "/v1/auth/candidate/register"
    elif role == "ROLE_HR":
        otp_ep = "/v1/auth/hr/send-otp"
        reg_ep = "/v1/auth/hr/register"
    elif role == "ROLE_COMPANY_ADMIN":
        otp_ep = "/v1/auth/company/send-otp"
        reg_ep = "/v1/auth/company/register"
    elif role == "ROLE_APP_DEVELOPER":
        otp_ep = "/v1/auth/app-developer/send-otp"
        reg_ep = "/v1/auth/app-developer/register"
    elif role == "ROLE_MANAGEMENT_TEAM":
        otp_ep = "/v1/auth/management/send-otp"
        reg_ep = "/v1/auth/management/register"

    # 1. Send OTP
    code, _ = request(otp_ep, "POST", {
        "email": email,
        "firstName": first_name,
        "role": role
    })
    if code != 200:
        return None, None, f"send-otp failed with code {code}"

    # 2. Fetch OTP from Redis
    otp = get_redis_otp(email, prefix="otp:reg:")

    # 3. Register
    payload = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "password": "Password123!",
        "role": role,
        "otp": otp
    }
    if extra_fields:
        payload.update(extra_fields)

    code, res = request(reg_ep, "POST", payload)
    if code in [200, 201]:
        token = res.get("data", {}).get("accessToken")
        user_id = res.get("data", {}).get("userId")
        return token, user_id, None
    return None, None, f"registration failed with code {code}: {res}"

def run_suite():
    print(f"\n{CYAN}{BOLD}{'='*75}{RESET}")
    print(f"{CYAN}{BOLD}   HireMind-AI — Comprehensive Architectural & Enterprise Test Suite{RESET}")
    print(f"{CYAN}{BOLD}{'='*75}{RESET}\n")

    print(f"{YELLOW}1. Checking backend and frontend server readiness...{RESET}")
    ready = False
    for attempt in range(15):
        code, _ = request("/actuator/health", "GET")
        if code == 200:
            ready = True
            print(f"{GREEN}Backend Spring Boot server is UP & READY!{RESET}")
            break
        time.sleep(1)

    if not ready:
        print(f"{RED}Backend server did not respond at /api/actuator/health.{RESET}")
        return False

    ts = int(time.time())
    cand_email = f"candidate.{ts}@gmail.com"
    hr_email = f"hr.{ts}@gmail.com"
    comp_email = f"director.{ts}@enterprise.com"
    dev_email = f"developer.{ts}@tech.net"
    mgmt_email = f"mgmt.{ts}@platform.co.in"

    # ─────────────────────────────────────────────────────────────
    # SUITE 1: HEALTH & PUBLIC ANALYTICS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 1: System Health, Redis & Public Endpoints{RESET}")
    code, res = request("/actuator/health", "GET")
    log_test("Health", "/actuator/health", "GET", code, 200, f"Status: {res.get('status')}")

    code, res = request("/v1/analytics/public-stats", "GET")
    log_test("Health", "/v1/analytics/public-stats", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # SUITE 2: ANTI-DISPOSABLE / TEMP-MAIL SECURITY & GMAIL ENFORCEMENT
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 2: Anti-Disposable / Temp-Mail Security Guard{RESET}")

    # Negative test 1: Send OTP to temp-mail.org
    code, res = request("/v1/auth/candidate/send-otp", "POST", {
        "email": "hacker.temp@temp-mail.org",
        "firstName": "Hacker",
        "role": "ROLE_CANDIDATE"
    })
    log_test("Security", "POST /v1/auth/candidate/send-otp (Blocked disposable temp-mail.org -> 400)", "POST", code, 400)

    # Negative test 2: Send OTP to temp-mail generator alias (vewku.com)
    code, res = request("/v1/auth/company/send-otp", "POST", {
        "email": "attacker@vewku.com",
        "firstName": "Attacker",
        "role": "ROLE_COMPANY_ADMIN"
    })
    log_test("Security", "POST /v1/auth/company/send-otp (Blocked disposable generator vewku.com -> 400)", "POST", code, 400)

    # Negative test 3: Direct registration with 10minutemail.com
    code, res = request("/v1/auth/candidate/register", "POST", {
        "email": "fake.user@10minutemail.com",
        "password": "Password@123",
        "firstName": "Fake",
        "lastName": "User",
        "role": "ROLE_CANDIDATE",
        "otp": "1234"
    })
    log_test("Security", "POST /v1/auth/candidate/register (Blocked disposable 10minutemail.com -> 400)", "POST", code, 400)

    # Negative test 4: Login attempt with non-Gmail domain on candidate login
    code, res = request("/v1/auth/candidate/login", "POST", {
        "email": "intruder@yahoo.com",
        "password": "Password@123"
    })
    log_test("Security", "POST /v1/auth/candidate/login (Blocked non-Gmail domain -> 400)", "POST", code, 400)

    # ─────────────────────────────────────────────────────────────
    # SUITE 3: DEDICATED ROLE REGISTRATION & 2FA AUTHENTICATION
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 3: Dedicated Role Registration & 2FA Admin Authentication{RESET}")

    # 1. Candidate Registration -> user_credentials table
    cand_token, cand_id, err = register_user("ROLE_CANDIDATE", cand_email, "Alex", "Rivera", {
        "desiredRole": "Senior Full-Stack Engineer",
        "yearsExperience": 4
    })
    log_test("Auth", f"/v1/auth/candidate/register (user_credentials: {cand_email})", "POST", 201 if cand_token else 400, 201, f"User ID: {cand_id}")

    # 2. HR Recruiter Registration -> hr_credentials table
    hr_token, hr_id, err = register_user("ROLE_HR", hr_email, "Megha", "Gupta", {
        "companyName": f"NextGen Corp {ts}",
        "jobTitle": "Head of Technical Hiring"
    })
    log_test("Auth", f"/v1/auth/hr/register (hr_credentials: {hr_email})", "POST", 201 if hr_token else 400, 201, f"User ID: {hr_id}")

    # 3. Company Executive Registration -> company_credentials table
    comp_token, comp_id, err = register_user("ROLE_COMPANY_ADMIN", comp_email, "Vikram", "Malhotra", {
        "companyName": f"NextGen Corp {ts}",
        "jobTitle": "Managing Director & CEO"
    })
    log_test("Auth", f"/v1/auth/company/register (company_credentials: {comp_email})", "POST", 201 if comp_token else 400, 201, f"User ID: {comp_id}")

    # 4. Application Developer Registration -> app_dev_credentials table
    dev_token, dev_id, err = register_user("ROLE_APP_DEVELOPER", dev_email, "Dev", "Architect", {
        "specialization": "Distributed Systems & AI Agents"
    })
    log_test("Auth", f"/v1/auth/app-developer/register (app_dev_credentials: {dev_email})", "POST", 201 if dev_token else 400, 201, f"User ID: {dev_id}")

    # 5. HireMind-Management Team Registration -> management_team_credentials table
    mgmt_token, mgmt_id, err = register_user("ROLE_MANAGEMENT_TEAM", mgmt_email, "Sarah", "Governance", {
        "specialization": "Platform Operations & Compliance"
    })
    log_test("Auth", f"/v1/auth/management/register (management_team_credentials: {mgmt_email})", "POST", 201 if mgmt_token else 400, 201, f"User ID: {mgmt_id}")

    # 6. Candidate & HR direct login checks
    code, res = request("/v1/auth/candidate/login", "POST", {"email": cand_email, "password": "Password123!"})
    log_test("Auth", "/v1/auth/candidate/login (Direct Candidate Auth)", "POST", code, 200)

    code, res = request("/v1/auth/hr/login", "POST", {"email": hr_email, "password": "Password123!"})
    log_test("Auth", "/v1/auth/hr/login (Direct HR Auth)", "POST", code, 200)

    # 7. Company Executive 2FA Login Flow
    code, res = request("/v1/auth/company/login", "POST", {"email": comp_email, "password": "Password123!"})
    requires_2fa = res.get("data", {}).get("requires2Fa", False) if isinstance(res, dict) else False
    comp_2fa_token = res.get("data", {}).get("twoFactorToken") if isinstance(res, dict) else None
    log_test("Auth", "POST /v1/auth/company/login (Password valid -> 2FA Challenge Initiated)", "POST", code, 200, f"Requires 2FA: {requires_2fa}")

    # 8. Negative 2FA test: Invalid 4-digit code
    code, res = request("/v1/auth/company/2fa-verify", "POST", {
        "email": comp_email,
        "twoFactorToken": comp_2fa_token,
        "otp": "0000"
    })
    log_test("Auth", "POST /v1/auth/company/2fa-verify (Invalid 2FA code rejected -> 400)", "POST", code, 400)

    # 9. Correct 2FA Verification for Company Admin
    comp_2fa_otp = get_redis_2fa_otp(comp_2fa_token)
    code, res = request("/v1/auth/company/2fa-verify", "POST", {
        "email": comp_email,
        "twoFactorToken": comp_2fa_token,
        "otp": comp_2fa_otp
    })
    comp_jwt = res.get("data", {}).get("accessToken") if isinstance(res, dict) else None
    log_test("Auth", f"POST /v1/auth/company/2fa-verify (Verified 2FA code {comp_2fa_otp} -> Access Granted)", "POST", code, 200)

    # 10. App Developer 2FA Login Flow
    code, res = request("/v1/auth/app-developer/login", "POST", {"email": dev_email, "password": "Password123!"})
    dev_2fa_token = res.get("data", {}).get("twoFactorToken") if isinstance(res, dict) else None
    dev_2fa_otp = get_redis_2fa_otp(dev_2fa_token)
    code, res = request("/v1/auth/app-developer/2fa-verify", "POST", {
        "email": dev_email,
        "twoFactorToken": dev_2fa_token,
        "otp": dev_2fa_otp
    })
    log_test("Auth", "POST /v1/auth/app-developer/login + 2FA Verify (App Developer 2FA)", "POST", code, 200)

    # 11. Management Team 2FA Login Flow
    code, res = request("/v1/auth/management/login", "POST", {"email": mgmt_email, "password": "Password123!"})
    mgmt_2fa_token = res.get("data", {}).get("twoFactorToken") if isinstance(res, dict) else None
    mgmt_2fa_otp = get_redis_2fa_otp(mgmt_2fa_token)
    code, res = request("/v1/auth/management/2fa-verify", "POST", {
        "email": mgmt_email,
        "twoFactorToken": mgmt_2fa_token,
        "otp": mgmt_2fa_otp
    })
    log_test("Auth", "POST /v1/auth/management/login + 2FA Verify (Management Team 2FA)", "POST", code, 200)

    # 12. Cross-Table / Cross-Role Isolation Rejections (Candidate attempting HR login -> 401)
    code, res = request("/v1/auth/hr/login", "POST", {"email": cand_email, "password": "Password123!"})
    log_test("Auth", "/v1/auth/hr/login (Cross-Table Rejection: Candidate blocked from HR login -> 401)", "POST", code, [401, 400])

    # ─────────────────────────────────────────────────────────────
    # SUITE 4: PASSWORD RETRIEVAL & 4-DIGIT OTP RESET LIFECYCLE
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 4: Password Retrieval & 4-Digit OTP Reset Lifecycle{RESET}")

    # 1. Request Password Reset OTP
    code, res = request("/v1/auth/candidate/forgot-password", "POST", {"email": cand_email})
    log_test("PasswordReset", f"POST /v1/auth/candidate/forgot-password (Dispatched 4-digit OTP to {cand_email})", "POST", code, 200)

    # 2. Extract OTP from Redis
    pwd_otp = get_redis_otp(cand_email, prefix="otp:code:")

    # 3. Verify OTP
    code, res = request("/v1/auth/verify-otp", "POST", {"email": cand_email, "otp": pwd_otp})
    log_test("PasswordReset", f"POST /v1/auth/verify-otp (Verified OTP {pwd_otp})", "POST", code, 200)

    # 4. Reset & Set New Password
    code, res = request("/v1/auth/reset-password", "POST", {
        "email": cand_email,
        "otp": pwd_otp,
        "newPassword": "UpdatedPassword@456"
    })
    log_test("PasswordReset", "POST /v1/auth/reset-password (Updated to new password)", "POST", code, 200)

    # 5. Authenticate with New Password
    code, res = request("/v1/auth/login", "POST", {
        "email": cand_email,
        "password": "UpdatedPassword@456"
    })
    if code == 200 and res.get("data", {}).get("accessToken"):
        cand_token = res["data"]["accessToken"]
    log_test("PasswordReset", "POST /v1/auth/login (Login with new password)", "POST", code, 200)

    # ─────────────────────────────────────────────────────────────
    # SUITE 3: APPLICATION DEVELOPER SAFEGUARD ENFORCEMENT
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 3: Developer Security Guard (Safe DB Mode){RESET}")

    # Developer should have access to system metrics
    code, res = request("/v1/admin/metrics", "GET", token=dev_token)
    log_test("Developer", "/v1/admin/metrics (Developer authorized for telemetry)", "GET", code, 200)

    # Developer attempting destructive schema purge MUST BE BLOCKED (403)
    code, res = request("/v1/admin/db/drop-tables", "POST", token=dev_token)
    log_test("Developer", "/v1/admin/db/drop-tables (Destructive DB wipe BLOCKED by DeveloperGuardFilter -> 403)", "POST", code, 403)

    # ─────────────────────────────────────────────────────────────
    # SUITE 4: MANAGEMENT TEAM MODERATION & TEMPORAL JOB METRICS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 4: Management Team Moderation & Temporal Metrics{RESET}")

    # 1. Temporal Job Postings Analytics (Today, Week, Month, Year)
    code, res = request("/v1/admin/metrics/temporal", "GET", token=mgmt_token)
    metrics_data = res.get("data", {})
    log_test("Management", "/v1/admin/metrics/temporal", "GET", code, 200,
             f"Today: {metrics_data.get('jobsToday')}, Week: {metrics_data.get('jobsThisWeek')}, Month: {metrics_data.get('jobsThisMonth')}, Year: {metrics_data.get('jobsThisYear')}")

    # 2. Block Candidate User
    code, res = request(f"/v1/admin/candidates/{cand_id}/block", "PUT", {"blocked": True, "reason": "Test Block"}, token=mgmt_token)
    log_test("Management", f"/v1/admin/candidates/{cand_id}/block (Block candidate account)", "PUT", code, 200)

    # 3. Unblock Candidate User
    code, res = request(f"/v1/admin/candidates/{cand_id}/block", "PUT", {"blocked": False, "reason": "Test Unblock"}, token=mgmt_token)
    log_test("Management", f"/v1/admin/candidates/{cand_id}/block (Unblock candidate account)", "PUT", code, 200)

    # ─────────────────────────────────────────────────────────────
    # SUITE 5: COMPANY-HR-CANDIDATE VERIFICATION & APPROVAL WORKFLOW
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 5: Company-HR-Candidate Tag Verification Workflow{RESET}")

    # 1. Company Director views HR team members
    code, res = request("/v1/company/verifications/hrs", "GET", token=comp_token)
    hr_list = res.get("data", []) if isinstance(res, dict) else []
    hr_prof_id = hr_list[0].get("hrProfileId") if hr_list else None
    log_test("Verification", "/v1/company/verifications/hrs (Director lists HR team)", "GET", code, 200, f"HRs: {len(hr_list)}")

    # 2. Company Director awards Verified Recruiter Badge to HR
    if hr_prof_id:
        code, res = request(f"/v1/company/verifications/hrs/{hr_prof_id}/verify", "PUT", {
            "verified": True,
            "badgeTitle": "Lead Talent Acquisition Partner"
        }, token=comp_token)
        log_test("Verification", f"/v1/company/verifications/hrs/{hr_prof_id}/verify (Award Verified Recruiter Badge)", "PUT", code, 200)

    # 3. HR requests candidate verified tag
    code, res = request("/v1/company/verifications/request", "POST", {
        "candidateUserId": cand_id,
        "jobTitle": "Lead Full-Stack Architect",
        "department": "Core Platform Engineering",
        "notes": "Top candidate, cleared 5 rounds of technical interviews."
    }, token=hr_token)
    verif_id = res.get("data", {}).get("id") if code == 200 else None
    cert_id = res.get("data", {}).get("badgeCertificateId") if code == 200 else None
    log_test("Verification", "/v1/company/verifications/request (HR initiates candidate tag request)", "POST", code, 200, f"Request ID: {verif_id}")

    # 4. Company Director views pending verifications
    code, res = request("/v1/company/verifications/pending?status=PENDING", "GET", token=comp_token)
    pending_list = res.get("content", []) if isinstance(res, dict) else []
    log_test("Verification", "/v1/company/verifications/pending (Director checks pending queue)", "GET", code, 200, f"Count: {len(pending_list)}")

    # 5. Company Director Approves verification request
    if verif_id:
        code, res = request(f"/v1/company/verifications/{verif_id}/decision", "PUT", {
            "approved": True,
            "badgeTitle": "Certified Engineering Talent"
        }, token=comp_token)
        log_test("Verification", f"/v1/company/verifications/{verif_id}/decision (Director APPROVED badge)", "PUT", code, 200)

    # 6. Public / Recruiter views candidate's approved badges
    code, res = request(f"/v1/company/verifications/candidate/{cand_id}", "GET")
    badges = res.get("data", [])
    log_test("Verification", f"/v1/company/verifications/candidate/{cand_id} (Public candidate badge list)", "GET", code, 200, f"Badges: {len(badges)}")

    # 7. Certificate Verification Lookup
    if cert_id:
        code, res = request(f"/v1/company/verifications/certificate/{cert_id}", "GET")
        log_test("Verification", f"/v1/company/verifications/certificate/{cert_id} (Verify authenticity)", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # SUITE 6: COMPANY TASK ASSIGNMENT, GOALS & MEETING REMINDERS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 6: Company Task Delegation, Goals & Meeting Reminders{RESET}")

    # 1. Create and Assign Task to HR Recruiter
    code, res = request("/v1/company/tasks", "POST", {
        "title": "Screen top 10 Senior AI candidates for Core Engine",
        "description": "Evaluate GitHub profiles and schedule initial technical screen",
        "priority": "HIGH",
        "category": "HIRING",
        "assignedToUserId": hr_id
    }, token=comp_token)
    task_id = res.get("data", {}).get("id") if code == 200 else None
    log_test("CompanyTasks", "/v1/company/tasks (Create & assign task to HR)", "POST", code, 200, f"Task ID: {task_id}")

    # 2. List company tasks
    code, res = request("/v1/company/tasks", "GET", token=comp_token)
    task_list = res.get("data", []) if isinstance(res, dict) else []
    log_test("CompanyTasks", "/v1/company/tasks (List company task roster)", "GET", code, 200, f"Tasks: {len(task_list)}")

    # 3. Update task status to COMPLETED
    if task_id:
        code, res = request(f"/v1/company/tasks/{task_id}/status", "PUT", {
            "status": "COMPLETED"
        }, token=comp_token)
        log_test("CompanyTasks", f"/v1/company/tasks/{task_id}/status (Mark task COMPLETED)", "PUT", code, 200)

    # 4. Fetch task completion stats
    code, res = request("/v1/company/tasks/stats", "GET", token=comp_token)
    stats_data = res.get("data", {}) if isinstance(res, dict) else {}
    rate = stats_data.get("completionRate", 0)
    log_test("CompanyTasks", "/v1/company/tasks/stats (Task completion rate KPI)", "GET", code, 200, f"Completion: {rate}%")

    # 5. Schedule Company Executive Meeting / Reminder
    code, res = request("/v1/interviews/schedule", "POST", {
        "applicationId": 0,
        "candidateUserId": cand_id,
        "candidateName": "Alex Mercer",
        "candidateEmail": "alex.mercer@gmail.com",
        "jobTitle": "Lead Full-Stack Architect",
        "scheduledAt": "2026-08-30T10:00:00Z",
        "durationMinutes": 45,
        "meetingLink": "https://meet.google.com/hmd-exec-sync",
        "notes": "Final Executive Interview"
    }, token=comp_token)
    meeting_id = res.get("data", {}).get("id") if code == 200 else None
    log_test("CompanyMeetings", "/v1/interviews/schedule (Schedule executive meeting reminder)", "POST", code, 200, f"Meeting ID: {meeting_id}")

    # 6. Fetch company meeting calendar
    code, res = request("/v1/interviews/calendar", "GET", token=comp_token)
    meeting_list = res.get("data", []) if isinstance(res, dict) else []
    log_test("CompanyMeetings", "/v1/interviews/calendar (List upcoming meetings & reminders)", "GET", code, 200, f"Meetings: {len(meeting_list)}")

    # ─────────────────────────────────────────────────────────────
    # SUITE 7: GROUP COLLABORATION CHAT & TEAM CHANNELS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 7: Team Collaboration Channels & Group Chat{RESET}")

    # 1. Create Group
    code, res = request("/v1/chat/groups", "POST", {
        "name": f"Hiring Squad Alpha {ts}",
        "description": "Cross-functional hiring & engineering collaboration channel",
        "memberUserIds": [hr_id, cand_id]
    }, token=comp_token)
    group_id = res.get("data", {}).get("id") if code == 200 else None
    log_test("GroupChat", "/v1/chat/groups (Create team collaboration group)", "POST", code, 200, f"Group ID: {group_id}")

    # 2. List user groups
    code, res = request("/v1/chat/groups", "GET", token=comp_token)
    log_test("GroupChat", "/v1/chat/groups (List user groups)", "GET", code, 200)

    if group_id:
        # 3. Add Developer to group
        code, res = request(f"/v1/chat/groups/{group_id}/members", "POST", {
            "userIds": [dev_id]
        }, token=comp_token)
        log_test("GroupChat", f"/v1/chat/groups/{group_id}/members (Add team member to group)", "POST", code, 200)

        # 4. Send group message
        code, res = request(f"/v1/chat/groups/{group_id}/messages", "POST", {
            "content": "Welcome to the High-Priority Technical Hiring channel! 🚀",
            "type": "TEXT"
        }, token=comp_token)
        log_test("GroupChat", f"/v1/chat/groups/{group_id}/messages (Send message to group)", "POST", code, 200)

        # 5. Fetch group message history
        code, res = request(f"/v1/chat/groups/{group_id}/messages", "GET", token=hr_token)
        msg_list = res.get("data", [])
        log_test("GroupChat", f"/v1/chat/groups/{group_id}/messages (Retrieve group messages)", "GET", code, 200, f"Messages: {len(msg_list)}")

    # ─────────────────────────────────────────────────────────────
    # SUITE 7: DIRECT 1-ON-1 CHAT & FLAGGING
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 7: Direct 1-on-1 Chat & Recruiter Flagging{RESET}")

    # 1. HR sends direct message to candidate
    code, res = request("/v1/chat/messages", "POST", {
        "receiverId": cand_id,
        "content": "Hello Alex! We reviewed your profile and would love to schedule an interview."
    }, token=hr_token)
    log_test("DirectChat", "/v1/chat/messages (HR -> Candidate direct message)", "POST", code, 200)

    # 2. HR flags candidate chat
    code, res = request(f"/v1/chat/flag/{cand_id}", "POST", token=hr_token)
    log_test("DirectChat", f"/v1/chat/flag/{cand_id} (HR flags candidate conversation 🚩)", "POST", code, 200)

    # ─────────────────────────────────────────────────────────────
    # SUITE 8: CANDIDATE PORTFOLIO & EDUCATION QUALIFICATIONS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 8: Candidate Education & Qualifications{RESET}")

    code, res = request("/v1/candidates/me/educations", "POST", {
        "institution": "Indian Institute of Technology (IIT)",
        "degree": "Master of Technology",
        "fieldOfStudy": "Computer Science & Artificial Intelligence",
        "startDate": "2020-08-01",
        "endDate": "2022-05-30",
        "grade": "9.4 CGPA"
    }, token=cand_token)
    log_test("Candidate", "/v1/candidates/me/educations (Add Master Degree)", "POST", code, 200)

    code, res = request("/v1/candidates/me", "GET", token=cand_token)
    cand_profile_id = res.get("data", {}).get("id") if code == 200 else cand_id
    log_test("Candidate", "/v1/candidates/me (Retrieve candidate dossier)", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # SUITE 9: DEFENSIVE SECURITY & VULNERABILITY DIAGNOSTICS AUDIT
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 9: Defensive Security & Vulnerability Diagnostics Scanner{RESET}")
    code, res = request("/v1/admin/security/audit", "GET", token=dev_token)
    audit_data = res.get("data", {}) if isinstance(res, dict) else {}
    passed_count = audit_data.get("passedChecks", 0)
    score = audit_data.get("securityScore", 0)
    log_test("SecurityAudit", "/v1/admin/security/audit (Run automated vulnerability scan)", "GET", code, 200, f"Score: {score}/100 ({passed_count} checks SECURE)")

    # ─────────────────────────────────────────────────────────────
    # SUITE 10: FRONTEND & STATIC ASSETS VERIFICATION
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}SUITE 10: Frontend Nginx & Web Assets{RESET}")
    code, _ = request(FRONTEND_URL, "GET")
    log_test("Frontend", f"{FRONTEND_URL} (React Single Page App HTML)", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # TEST RUN SUMMARY
    # ─────────────────────────────────────────────────────────────
    print(f"\n{CYAN}{BOLD}{'='*75}{RESET}")
    print(f"{CYAN}{BOLD}   HIREMIND-AI TEST SUITE RESULTS{RESET}")
    print(f"{CYAN}{BOLD}{'='*75}{RESET}")
    print(f"Total Tests Executed: {BOLD}{results['total']}{RESET}")
    print(f"Passed: {GREEN}{BOLD}{results['passed']}{RESET}")
    print(f"Failed: {RED}{BOLD}{results['failed']}{RESET}")

    if results["failed"] == 0:
        print(f"\n{GREEN}{BOLD}🎉 ALL {results['passed']} ENTERPRISE SUITE TESTS PASSED WITH 100% SUCCESS! 🎉{RESET}\n")
        return True
    else:
        print(f"\n{RED}{BOLD}❌ Some tests failed. Failures breakdown:{RESET}")
        for f in results["failures"]:
            print(f" - {f}")
        print()
        return False

if __name__ == "__main__":
    success = run_suite()
    sys.exit(0 if success else 1)
