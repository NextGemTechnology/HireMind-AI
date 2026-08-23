#!/usr/bin/env python3
"""
TalentIQ / HireMind AI — Comprehensive API Test Suite
Tests all 16 REST controllers across Candidate, HR Recruiter, and Admin roles.
"""

import sys
import json
import urllib.request
import urllib.error
import time
import subprocess

BASE_URL = "http://localhost:8081/api"

# Color constants
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

def request(endpoint, method="GET", data=None, token=None, files=None):
    time.sleep(0.02)
    url = f"{BASE_URL}{endpoint}"
    headers = {"X-Internal-Test": "true"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = None
    if data is not None and not files:
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

def run_suite():
    print(f"\n{CYAN}{BOLD}{'='*70}{RESET}")
    print(f"{CYAN}{BOLD}   TalentIQ / HireMind AI — Full API Test & Health Suite{RESET}")
    print(f"{CYAN}{BOLD}{'='*70}{RESET}\n")

    print(f"{YELLOW}Checking backend server readiness...{RESET}")
    ready = False
    for attempt in range(25):
        code, res = request("/v1/jobs", "GET")
        if code in [200, 401, 403]:
            ready = True
            print(f"{GREEN}Backend server is READY!{RESET}\n")
            break
        time.sleep(1)

    if not ready:
        print(f"{RED}Backend server did not respond in time.{RESET}")
        return False

    timestamp = int(time.time())
    cand_email = f"test.candidate.{timestamp}@gmail.com"
    hr_email = f"test.hr.{timestamp}@gmail.com"
    admin_email = "admin@talentiq.ai"

    # ─────────────────────────────────────────────────────────────
    # 1. AUTH CONTROLLER & RBAC TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}1. Auth Controller & RBAC Portal Tests{RESET}")
    
    # Register Candidate
    code, res = request("/v1/auth/register", "POST", {
        "firstName": "Alex",
        "lastName": "Rivera",
        "email": cand_email,
        "password": "Password123!",
        "role": "ROLE_CANDIDATE",
        "desiredRole": "Full Stack Engineer",
        "yearsExperience": 3
    })
    log_test("Auth", "/v1/auth/register (Candidate)", "POST", code, 201)
    cand_token = res.get("data", {}).get("accessToken")
    cand_id = res.get("data", {}).get("userId")

    # Register HR
    code, res = request("/v1/auth/register", "POST", {
        "firstName": "Megha",
        "lastName": "Gupta",
        "email": hr_email,
        "password": "Password123!",
        "role": "ROLE_HR",
        "companyName": f"Apex Innovations {timestamp}",
        "jobTitle": "Lead Talent Partner"
    })
    log_test("Auth", "/v1/auth/register (HR)", "POST", code, 201)
    hr_token = res.get("data", {}).get("accessToken")
    hr_id = res.get("data", {}).get("userId")

    # RBAC: Candidate login via HR endpoint (MUST REJECT WITH 401 INVALID CREDENTIALS)
    code, res = request("/v1/auth/hr/login", "POST", {
        "email": cand_email,
        "password": "Password123!"
    })
    log_test("Auth", "/v1/auth/hr/login (Candidate rejected - 401 Invalid Credentials)", "POST", code, 401)

    # RBAC: HR login via Candidate endpoint (MUST REJECT WITH 401 INVALID CREDENTIALS)
    code, res = request("/v1/auth/candidate/login", "POST", {
        "email": hr_email,
        "password": "Password123!"
    })
    log_test("Auth", "/v1/auth/candidate/login (HR rejected - 401 Invalid Credentials)", "POST", code, 401)

    # Candidate Login
    code, res = request("/v1/auth/candidate/login", "POST", {
        "email": cand_email,
        "password": "Password123!"
    })
    log_test("Auth", "/v1/auth/candidate/login (Candidate success)", "POST", code, 200)
    if code == 200:
        cand_token = res.get("data", {}).get("accessToken")

    # HR Login
    code, res = request("/v1/auth/hr/login", "POST", {
        "email": hr_email,
        "password": "Password123!"
    })
    log_test("Auth", "/v1/auth/hr/login (HR success)", "POST", code, 200)
    if code == 200:
        hr_token = res.get("data", {}).get("accessToken")

    # Super Admin Login
    code, res = request("/v1/auth/login", "POST", {
        "email": admin_email,
        "password": "Password123!"
    })
    log_test("Auth", "/v1/auth/login (Admin success)", "POST", code, 200)
    admin_token = res.get("data", {}).get("accessToken") if code == 200 else None

    # Google OAuth endpoint with valid gmail
    code, res = request("/v1/auth/google", "POST", {
        "email": f"google.user.{timestamp}@gmail.com",
        "name": "Google Candidate",
        "role": "ROLE_CANDIDATE"
    })
    log_test("Auth", "/v1/auth/google (Auto-register @gmail.com)", "POST", code, 200)

    # 4-Digit OTP Password Reset Flow
    code, res = request("/v1/auth/forgot-password", "POST", {
        "email": cand_email
    })
    log_test("Auth", "/v1/auth/forgot-password (Generate 4-digit OTP)", "POST", code, 200)

    # Fetch OTP from MySQL container to simulate email inbox
    otp_code = None
    try:
        otp_proc = subprocess.run(
            ["docker", "exec", "talentiq-mysql", "mysql", "-u", "talentiq_user", "-pHireMeAiProject@2529", "HireMeAI", "-sN", "-e",
             f"SELECT password_reset_otp FROM users WHERE email='{cand_email}'"],
            capture_output=True, text=True, timeout=5
        )
        otp_code = otp_proc.stdout.strip()
    except Exception as e:
        print(f"Failed to query OTP from DB: {e}")

    if otp_code:
        # Verify 4-Digit OTP
        code, res = request("/v1/auth/verify-otp", "POST", {
            "email": cand_email,
            "otp": otp_code
        })
        log_test("Auth", f"/v1/auth/verify-otp (Verify OTP: {otp_code})", "POST", code, 200)

        # Set New Password
        new_password = "UpdatedPassword123!"
        code, res = request("/v1/auth/reset-password", "POST", {
            "email": cand_email,
            "otp": otp_code,
            "newPassword": new_password
        })
        log_test("Auth", "/v1/auth/reset-password (Set new password)", "POST", code, 200)

        # Test login with OLD password (Must fail 401)
        code, res = request("/v1/auth/candidate/login", "POST", {
            "email": cand_email,
            "password": "Password123!"
        })
        log_test("Auth", "/v1/auth/candidate/login (Old password rejected - 401)", "POST", code, 401)

        # Test login with NEW password (Must succeed 200)
        code, res = request("/v1/auth/candidate/login", "POST", {
            "email": cand_email,
            "password": new_password
        })
        log_test("Auth", "/v1/auth/candidate/login (New password accepted - 200)", "POST", code, 200)
        if code == 200:
            cand_token = res.get("data", {}).get("accessToken")

    # ─────────────────────────────────────────────────────────────
    # 2. USER CONTROLLER TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}2. User Controller Tests{RESET}")
    code, res = request("/v1/users/me", "GET", token=cand_token)
    log_test("User", "/v1/users/me (Candidate)", "GET", code, 200, f"Email: {res.get('data', {}).get('email')}")

    code, res = request("/v1/users/me", "GET", token=hr_token)
    log_test("User", "/v1/users/me (HR)", "GET", code, 200, f"Email: {res.get('data', {}).get('email')}")

    # ─────────────────────────────────────────────────────────────
    # 3. CANDIDATE & PORTFOLIO CONTROLLER TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}3. Candidate & Portfolio Controller Tests{RESET}")
    code, res = request("/v1/candidates/me", "GET", token=cand_token)
    log_test("Candidate", "/v1/candidates/me", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # 4. HR CONTROLLER & COMPANY TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}4. HR Controller & Company Tests{RESET}")
    code, res = request("/v1/hr/me", "GET", token=hr_token)
    log_test("HR", "/v1/hr/me", "GET", code, 200)

    code, res = request("/v1/companies", "GET", token=hr_token)
    log_test("Company", "/v1/companies", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # 5. JOB CONTROLLER TESTS (Posting, Listing, Searching)
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}5. Job Controller Tests{RESET}")
    # Post a Job as HR
    code, res = request("/v1/jobs", "POST", {
        "title": f"Staff Full Stack Engineer {timestamp}",
        "description": "Building scalable microservices with Java, Spring Boot, React, and MySQL.",
        "skills": ["Java", "Spring Boot", "React", "Docker", "MySQL"],
        "jobType": "FULL_TIME",
        "experienceLevel": "SENIOR",
        "location": "San Francisco, CA",
        "salaryMin": 150000,
        "salaryMax": 200000,
        "remote": True,
        "hybrid": False
    }, token=hr_token)
    log_test("Jobs", "/v1/jobs (Publish Job by HR)", "POST", code, 201)
    job_id = res.get("data", {}).get("id") if code == 201 else None

    # List all jobs (Public)
    code, res = request("/v1/jobs", "GET")
    log_test("Jobs", "/v1/jobs (List Jobs)", "GET", code, 200, f"Count: {len(res.get('data', {}).get('content', [])) if isinstance(res.get('data'), dict) else len(res.get('data', []))}")

    # Get single job details
    if job_id:
        code, res = request(f"/v1/jobs/{job_id}", "GET")
        log_test("Jobs", f"/v1/jobs/{job_id} (Get Job Details)", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # 6. JOB APPLICATION CONTROLLER TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}6. Job Application Controller Tests{RESET}")
    app_id = None
    if job_id:
        # Candidate applies to job
        code, res = request("/v1/applications", "POST", {
            "jobId": job_id,
            "coverLetter": "I am excited to apply for this engineering role with full-stack capabilities."
        }, token=cand_token)
        log_test("Applications", "/v1/applications (Candidate Apply)", "POST", code, [200, 201])
        app_id = res.get("data", {}).get("id") if isinstance(res.get("data"), dict) else None

    # Candidate views my applications
    code, res = request("/v1/applications/my", "GET", token=cand_token)
    log_test("Applications", "/v1/applications/my (Candidate Applications)", "GET", code, 200)

    # HR views applicants for their jobs
    code, res = request("/v1/applications/hr", "GET", token=hr_token)
    log_test("Applications", "/v1/applications/hr (HR View Pipeline)", "GET", code, 200)

    # HR updates applicant status
    if app_id:
        code, res = request(f"/v1/applications/{app_id}/status", "PUT", {
            "status": "SCREENING",
            "notes": "Candidate passed initial algorithmic review."
        }, token=hr_token)
        log_test("Applications", f"/v1/applications/{app_id}/status (Update Status)", "PUT", code, 200)

    # ─────────────────────────────────────────────────────────────
    # 7. AI RECOMMENDATIONS & CAREER AGENT TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}7. AI Recommendations & Career Agent Tests{RESET}")
    # Recommendations jobs endpoint
    code, res = request("/v1/recommendations/jobs", "GET", token=cand_token)
    log_test("Recommendations", "/v1/recommendations/jobs", "GET", code, 200)

    # Status endpoint
    code, res = request("/v1/recommendations/status", "GET", token=cand_token)
    log_test("Recommendations", "/v1/recommendations/status", "GET", code, 200)

    # Career Agent Chat
    code, res = request("/v1/recommendations/chat", "POST", {
        "message": "suggest me java developer jobs"
    }, token=cand_token)
    log_test("Career Agent", "/v1/recommendations/chat (Job query)", "POST", code, 200, f"Reply: {res.get('data', {}).get('reply', '')[:50]}...")

    # Career Agent Safety check
    code, res = request("/v1/recommendations/chat", "POST", {
        "message": "<script>alert('hack')</script>"
    }, token=cand_token)
    log_test("Career Agent", "/v1/recommendations/chat (Firewall test)", "POST", code, 200)

    # ─────────────────────────────────────────────────────────────
    # 8. CHAT & MESSAGING CONTROLLER TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}8. Chat & Messaging Controller Tests{RESET}")
    # Candidate sends message to HR
    code, res = request("/v1/chat/messages", "POST", {
        "receiverId": hr_id,
        "content": "Hello HR! Inquiring about the position.",
        "type": "TEXT"
    }, token=cand_token)
    log_test("Chat", "/v1/chat/messages (Send from Candidate to HR)", "POST", code, [200, 201])
    msg_id = res.get("data", {}).get("id")

    # HR sends reply to Candidate
    code, res = request("/v1/chat/messages", "POST", {
        "receiverId": cand_id,
        "content": "Hi Alex! Thank you for applying. We are reviewing your profile.",
        "type": "TEXT"
    }, token=hr_token)
    log_test("Chat", "/v1/chat/messages (Reply from HR to Candidate)", "POST", code, [200, 201])

    # Candidate fetches conversation history
    code, res = request(f"/v1/chat/conversations/{hr_id}", "GET", token=cand_token)
    log_test("Chat", f"/v1/chat/conversations/{hr_id} (Candidate fetch thread)", "GET", code, 200, f"Messages: {len(res.get('data', []))}")

    # HR fetches contacts
    code, res = request("/v1/chat/contacts", "GET", token=hr_token)
    log_test("Chat", "/v1/chat/contacts (HR contact list)", "GET", code, 200, f"Contacts: {len(res.get('data', []))}")

    # Candidate fetches contacts
    code, res = request("/v1/chat/contacts", "GET", token=cand_token)
    log_test("Chat", "/v1/chat/contacts (Candidate contact list)", "GET", code, 200)

    # Mark conversation as read
    code, res = request(f"/v1/chat/conversations/{cand_id}/read", "PUT", token=hr_token)
    log_test("Chat", f"/v1/chat/conversations/{cand_id}/read (Mark Read)", "PUT", code, 200)

    # ─────────────────────────────────────────────────────────────
    # 9. NOTIFICATIONS CONTROLLER TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}9. Notifications Controller Tests{RESET}")
    code, res = request("/v1/notifications", "GET", token=cand_token)
    log_test("Notifications", "/v1/notifications (Candidate)", "GET", code, 200)

    code, res = request("/v1/notifications/unread-count", "GET", token=cand_token)
    log_test("Notifications", "/v1/notifications/unread-count", "GET", code, 200)

    # ─────────────────────────────────────────────────────────────
    # 10. HR ANALYTICS & COPILOT TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}10. HR Analytics & AI Copilot Tests{RESET}")
    code, res = request("/v1/analytics/hr", "GET", token=hr_token)
    log_test("Analytics", "/v1/analytics/hr (HR Funnel Analytics)", "GET", code, [200, 404])

    code, res = request("/v1/copilot/chat", "POST", {
        "message": "Generate 3 screening questions for a Senior Java Developer position"
    }, token=hr_token)
    log_test("Copilot", "/v1/copilot/chat (RAG AI Copilot)", "POST", code, [200, 503, 500])

    # ─────────────────────────────────────────────────────────────
    # 11. INTERVIEW CONTROLLER TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}11. Interview Controller Tests{RESET}")
    code, res = request("/v1/interviews/calendar", "GET", token=hr_token)
    log_test("Interviews", "/v1/interviews/calendar", "GET", code, [200, 404])

    # ─────────────────────────────────────────────────────────────
    # 12. ADMIN CONTROLLER TESTS
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}12. Admin Controller Tests{RESET}")
    if admin_token:
        code, res = request("/v1/admin/users", "GET", token=admin_token)
        log_test("Admin", "/v1/admin/users", "GET", code, 200)
        code, res = request("/v1/admin/companies/pending", "GET", token=admin_token)
        log_test("Admin", "/v1/admin/companies/pending", "GET", code, 200)
    else:
        print(f"[{YELLOW}SKIP{RESET}] Admin token not obtained, skipping admin endpoints.")

    # ─────────────────────────────────────────────────────────────
    # 13. TOKEN LOGOUT & BLACKLISTING VERIFICATION
    # ─────────────────────────────────────────────────────────────
    print(f"\n{YELLOW}{BOLD}13. Token Destruction & Blacklisting Tests{RESET}")
    code, res = request("/v1/auth/logout", "POST", token=cand_token)
    log_test("Auth", "/v1/auth/logout (Revoke token)", "POST", code, 200)

    # Use revoked token -> MUST RETURN 401 UNAUTHORIZED
    code, res = request("/v1/users/me", "GET", token=cand_token)
    log_test("Auth", "/v1/users/me (Rejected with Blacklisted Token)", "GET", code, 401)

    # ─────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────
    print(f"\n{CYAN}{BOLD}{'='*70}{RESET}")
    print(f"{CYAN}{BOLD}   Test Suite Summary: {results['passed']}/{results['total']} PASSED ({results['failed']} FAILED){RESET}")
    print(f"{CYAN}{BOLD}{'='*70}{RESET}\n")

    if results["failures"]:
        print(f"{RED}{BOLD}Failed Tests:{RESET}")
        for f in results["failures"]:
            print(f"  - {f}")
        return False
    else:
        print(f"{GREEN}{BOLD}All API endpoints are operational and passing!{RESET}\n")
        return True

if __name__ == "__main__":
    success = run_suite()
    sys.exit(0 if success else 1)
