#!/usr/bin/env python3
"""
HireMind SaaS Platform — Comprehensive Automated API & Security Verification Suite
Tests:
1. Public & Actuator Endpoints
2. Email Security & Anti-Disposable Mail Shield (Hard-blocks temp-mail, 10minutemail, mailinator, etc.)
3. Genuine Email Acceptance & Verification
4. Multi-Role Authentication & Dynamic Token Acquisition
5. Strict RBAC & Role Locking Verification (Cross-role access rejection check)
6. Authorized Admin & Platform Feature Verification
"""

import sys
import json
import time
import urllib.request
import urllib.error
import subprocess
import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8081/api")

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

passed_tests = 0
failed_tests = 0

def fetch_otp_from_redis(email):
    for _ in range(10):
        try:
            cmd = ["docker", "exec", "talentiq-redis", "redis-cli", "get", f"otp:reg:{email.lower().strip()}"]
            out = subprocess.check_output(cmd, text=True).strip().replace('"', '')
            if ":" in out:
                return out.split(":")[1]
            if out and out != "(nil)":
                return out
        except Exception:
            pass
    return "1234"

def clear_redis_rate_limits():
    try:
        cmd = ["docker", "exec", "talentiq-redis", "sh", "-c", "redis-cli --scan --pattern 'otp:rate:*' | xargs -r redis-cli del"]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def log_test(name, success, details=""):
    global passed_tests, failed_tests
    if success:
        passed_tests += 1
        print(f"  {GREEN}✓ PASS{RESET} {BOLD}{name}{RESET} {details}")
    else:
        failed_tests += 1
        print(f"  {RED}✗ FAIL{RESET} {BOLD}{name}{RESET} {details}")

def make_request(url, method="GET", headers=None, body=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    headers["User-Agent"] = "HireMind-Security-Suite/1.0"

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(f"{BASE_URL}{url}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            try:
                json_data = json.loads(content)
            except Exception:
                json_data = content
            return status, json_data
    except urllib.error.HTTPError as e:
        status = e.code
        content = e.read().decode("utf-8")
        try:
            json_data = json.loads(content)
        except Exception:
            json_data = content
        return status, json_data
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print(f"\n{CYAN}{BOLD}======================================================={RESET}")
    print(f"{CYAN}{BOLD}  HIREMIND SAAS API SECURITY & RBAC VERIFICATION SUITE  {RESET}")
    print(f"{CYAN}{BOLD}======================================================={RESET}\n")

    # 1. Public & Infrastructure Health Checks
    print(f"{BOLD}[TEST SUITE 1] Public & Infrastructure Health Checks{RESET}")
    
    status, data = make_request("/actuator/health")
    log_test("GET /actuator/health", status == 200, f"(Status: {status})")

    status, data = make_request("/v1/public/stats")
    log_test("GET /v1/public/stats", status == 200 and data.get("success") == True, f"(Status: {status})")

    status, data = make_request("/v1/jobs")
    log_test("GET /v1/jobs (Public Feed)", status == 200 and data.get("success") == True, f"(Status: {status})")

    print()

    # 2. Email Security & Anti-Disposable Mail Shield
    print(f"{BOLD}[TEST SUITE 2] Email Security & Disposable Email Shield{RESET}")

    fake_emails = [
        "hacker@temp-mail.org",
        "spammer@tempmail.com",
        "user123@10minutemail.com",
        "test@mailinator.com",
        "fake@yopmail.com",
        "burner@guerrillamail.com",
        "disposable@throwawaymail.com",
        "trash@trashmail.com"
    ]

    for fake_email in fake_emails:
        status, data = make_request("/v1/auth/candidate/send-otp", method="POST", body={"email": fake_email})
        is_blocked = (status == 400) and (not data.get("success", False))
        log_test(f"Block Fake Email: {fake_email}", is_blocked, f"(Status: {status}, Msg: {data.get('message')})")

    genuine_emails = [
        "genuine.candidate@gmail.com",
        "user.account.hiremind@gmail.com",
        "genuine.developer@gmail.com"
    ]

    for genuine_email in genuine_emails:
        status, data = make_request("/v1/auth/candidate/send-otp", method="POST", body={"email": genuine_email, "firstName": "Genuine", "role": "ROLE_CANDIDATE"})
        is_accepted = (status == 200) and data.get("success", False)
        log_test(f"Allow Genuine Email: {genuine_email}", is_accepted, f"(Status: {status})")

    print()

    # 3. Multi-Role Authentication & Dynamic Token Generation
    print(f"{BOLD}[TEST SUITE 3] Multi-Role Authentication & Token Generation{RESET}")
    clear_redis_rate_limits()

    tokens = {}
    ts = int(time.time())

    # Candidate Registration / Login & Token
    cand_email = "yome1011011101@gmail.com"
    cand_pass = "abhay123"
    status, data = make_request("/v1/auth/candidate/login", method="POST", body={"email": cand_email, "password": cand_pass})
    if status == 200 and "data" in data and "accessToken" in data["data"]:
        tokens["CANDIDATE"] = data["data"]["accessToken"]
        log_test(f"Authenticate Candidate Account ({cand_email})", True)
    else:
        make_request("/v1/auth/candidate/send-otp", method="POST", body={"email": cand_email, "firstName": "Abhay", "role": "ROLE_CANDIDATE"})
        time.sleep(0.3)
        cand_otp = fetch_otp_from_redis(cand_email)
        reg_cand = {
            "email": cand_email,
            "password": cand_pass,
            "firstName": "Abhay",
            "lastName": "Gupta",
            "role": "ROLE_CANDIDATE",
            "otp": cand_otp
        }
        status, data = make_request("/v1/auth/candidate/register", method="POST", body=reg_cand)
        if status in (200, 201) and "data" in data and "accessToken" in data["data"]:
            tokens["CANDIDATE"] = data["data"]["accessToken"]
            log_test("Register Candidate Account", True)
        else:
            log_test("Register Candidate Account", False, f"(Status: {status}, Msg: {data.get('message')})")

    # HR Authentication (ag4035737@gmail.com / abhay123)
    hr_email = "ag4035737@gmail.com"
    hr_pass = "abhay123"
    status, data = make_request("/v1/auth/hr/login", method="POST", body={"email": hr_email, "password": hr_pass})
    if status == 200 and "data" in data and "accessToken" in data["data"]:
        tokens["HR"] = data["data"]["accessToken"]
        log_test(f"Authenticate HR Recruiter Account ({hr_email})", True)
    else:
        clear_redis_rate_limits()
        hr_email_reg = f"test.hr.{ts}@gmail.com"
        make_request("/v1/auth/hr/send-otp", method="POST", body={"email": hr_email_reg, "firstName": "Test", "role": "ROLE_HR"})
        time.sleep(0.3)
        hr_otp = fetch_otp_from_redis(hr_email_reg)
        reg_hr = {
            "email": hr_email_reg,
            "password": "Password@123!",
            "firstName": "Test",
            "lastName": "Recruiter",
            "companyName": "TechCorp Solutions",
            "jobTitle": "Talent Lead",
            "role": "ROLE_HR",
            "otp": hr_otp
        }
        status, data = make_request("/v1/auth/hr/register", method="POST", body=reg_hr)
        if status == 201 and "data" in data and "accessToken" in data["data"]:
            tokens["HR"] = data["data"]["accessToken"]
            log_test("Register HR Recruiter Account", True)
        else:
            log_test("Register HR Recruiter Account", False, f"(Status: {status}, Msg: {data.get('message')})")

    # App Developer Registration & Token
    clear_redis_rate_limits()
    dev_email = f"dev.{ts}@gmail.com"
    make_request("/v1/auth/app-developer/send-otp", method="POST", body={"email": dev_email, "firstName": "Alex", "role": "ROLE_APP_DEVELOPER"})
    time.sleep(0.5)
    dev_otp = fetch_otp_from_redis(dev_email)
    reg_dev = {
        "email": dev_email,
        "password": "Password@123!",
        "firstName": "Alex",
        "lastName": "Dev",
        "role": "ROLE_APP_DEVELOPER",
        "otp": dev_otp
    }
    status, data = make_request("/v1/auth/app-developer/register", method="POST", body=reg_dev)
    if status in (200, 201) and "data" in data and "accessToken" in data["data"]:
        tokens["APP_DEVELOPER"] = data["data"]["accessToken"]
        log_test("Register App Developer Account", True)
    else:
        log_test("Register App Developer Account", False, f"(Status: {status}, Msg: {data.get('message')})")

    # Service Team Registration & Token
    clear_redis_rate_limits()
    svc_email = f"mgmt.{ts}@gmail.com"
    make_request("/v1/auth/management/send-otp", method="POST", body={"email": svc_email, "firstName": "Sarah", "role": "ROLE_SERVICE_TEAM"})
    time.sleep(0.5)
    svc_otp = fetch_otp_from_redis(svc_email)
    reg_svc = {
        "email": svc_email,
        "password": "Password@123!",
        "firstName": "Sarah",
        "lastName": "Service",
        "role": "ROLE_SERVICE_TEAM",
        "otp": svc_otp
    }
    status, data = make_request("/v1/auth/management/register", method="POST", body=reg_svc)
    if status in (200, 201) and "data" in data and "accessToken" in data["data"]:
        tokens["SERVICE_TEAM"] = data["data"]["accessToken"]
        log_test("Register Service Team Account", True)
    else:
        log_test("Register Service Team Account", False, f"(Status: {status}, Msg: {data.get('message')})")

    # Company Manager Registration & Token
    clear_redis_rate_limits()
    comp_email = f"director.{ts}@gmail.com"
    make_request("/v1/auth/company/send-otp", method="POST", body={"email": comp_email, "firstName": "David", "role": "ROLE_COMPANY_ADMIN"})
    time.sleep(0.5)
    comp_otp = fetch_otp_from_redis(comp_email)
    reg_comp = {
        "email": comp_email,
        "password": "Password@123!",
        "firstName": "David",
        "lastName": "Director",
        "companyName": f"Enterprise-{ts}",
        "role": "ROLE_COMPANY_ADMIN",
        "otp": comp_otp
    }
    status, data = make_request("/v1/auth/company/register", method="POST", body=reg_comp)
    if status in (200, 201) and "data" in data and "accessToken" in data["data"]:
        tokens["COMPANY_ADMIN"] = data["data"]["accessToken"]
        log_test("Register Company Manager Account", True)
    else:
        log_test("Register Company Manager Account", False, f"(Status: {status}, Msg: {data.get('message')})")

    print()

    # 4. Strict RBAC Isolation & Role Lock Verification
    print(f"{BOLD}[TEST SUITE 4] Strict RBAC & Role Locking Verification{RESET}")

    # 4.1 Unauthenticated access to protected admin route MUST fail (401/403)
    status, data = make_request("/v1/admin/developer/dashboard")
    log_test("Block Unauthenticated access to /admin/developer/dashboard", status in (401, 403), f"(Status: {status})")

    # 4.2 Candidate token on App Developer endpoint MUST fail (401/403)
    if "CANDIDATE" in tokens:
        headers = {"Authorization": f"Bearer {tokens['CANDIDATE']}"}
        status, data = make_request("/v1/admin/developer/dashboard", headers=headers)
        log_test("Block Candidate token on App Developer dashboard", status in (401, 403), f"(Status: {status})")

        status, data = make_request("/v1/admin/super/revenue/overview", headers=headers)
        log_test("Block Candidate token on Super Admin revenue overview", status in (401, 403), f"(Status: {status})")

    # 4.3 HR token on App Developer endpoint MUST fail (401/403)
    if "HR" in tokens:
        headers = {"Authorization": f"Bearer {tokens['HR']}"}
        status, data = make_request("/v1/admin/developer/dashboard", headers=headers)
        log_test("Block HR token on App Developer dashboard", status in (401, 403), f"(Status: {status})")

    # 4.4 App Developer token on Service Team endpoint MUST fail (401/403)
    if "APP_DEVELOPER" in tokens:
        headers = {"Authorization": f"Bearer {tokens['APP_DEVELOPER']}"}
        status, data = make_request("/v1/admin/service/dashboard", headers=headers)
        log_test("Block App Developer token on Service Team dashboard", status in (401, 403), f"(Status: {status})")

        status, data = make_request("/v1/admin/super/revenue/overview", headers=headers)
        log_test("Block App Developer token on Super Admin revenue overview", status in (401, 403), f"(Status: {status})")

    # 4.5 Service Team token on App Developer endpoint MUST fail (401/403)
    if "SERVICE_TEAM" in tokens:
        headers = {"Authorization": f"Bearer {tokens['SERVICE_TEAM']}"}
        status, data = make_request("/v1/admin/developer/dashboard", headers=headers)
        log_test("Block Service Team token on App Developer dashboard", status in (401, 403), f"(Status: {status})")

    # 4.6 Company Admin token on App Developer endpoint MUST fail (401/403)
    if "COMPANY_ADMIN" in tokens:
        headers = {"Authorization": f"Bearer {tokens['COMPANY_ADMIN']}"}
        status, data = make_request("/v1/admin/developer/dashboard", headers=headers)
        log_test("Block Company Manager token on App Developer dashboard", status in (401, 403), f"(Status: {status})")

    print()

    # 5. Authorized Admin Endpoints Verification
    print(f"{BOLD}[TEST SUITE 5] Role-Authorized Feature Verification{RESET}")

    # 5.1 App Developer Dashboard
    if "APP_DEVELOPER" in tokens:
        headers = {"Authorization": f"Bearer {tokens['APP_DEVELOPER']}"}
        status, data = make_request("/v1/admin/developer/dashboard", headers=headers)
        log_test("App Developer access /v1/admin/developer/dashboard", status == 200 and data.get("success") == True)

        terminal_payload = {"tool": "READ_METRICS"}
        status, data = make_request("/v1/admin/developer/ai-terminal", method="POST", headers=headers, body=terminal_payload)
        log_test("App Developer execute AI Terminal tool (READ_METRICS)", status == 200 and data.get("success") == True)

    # 5.2 Service Team Dashboard
    if "SERVICE_TEAM" in tokens:
        headers = {"Authorization": f"Bearer {tokens['SERVICE_TEAM']}"}
        status, data = make_request("/v1/admin/service/dashboard", headers=headers)
        log_test("Service Team access /v1/admin/service/dashboard", status == 200 and data.get("success") == True)

        status, data = make_request("/v1/admin/service/companies/pending", headers=headers)
        log_test("Service Team access /v1/admin/service/companies/pending", status == 200)

    # 5.3 Company Manager Workspace
    if "COMPANY_ADMIN" in tokens:
        headers = {"Authorization": f"Bearer {tokens['COMPANY_ADMIN']}"}
        status, data = make_request("/v1/admin/company/dashboard", headers=headers)
        log_test("Company Manager access /v1/admin/company/dashboard", status == 200 and data.get("success") == True)

    print()

    # 6. Payment & Subscription Microservice Verification
    print(f"{BOLD}[TEST SUITE 6] Payment & Subscription Microservice Verification{RESET}")

    # 6.1 Public Plans Catalog
    status, data = make_request("/v1/subscriptions/plans")
    log_test("Fetch Public Plans Catalog", status == 200 and len(data.get("data", [])) >= 5)

    # 6.2 Filter Plans by Candidate Role
    status, data = make_request("/v1/subscriptions/plans?role=CANDIDATE")
    cand_plans = data.get("data", [])
    log_test("Fetch Candidate Filtered Plans", status == 200 and len(cand_plans) >= 1)

    # 6.3 Candidate Subscription & Purchase Workflow
    if "CANDIDATE" in tokens:
        headers = {"Authorization": f"Bearer {tokens['CANDIDATE']}"}

        # Cancel any active subscription first to allow fresh purchase
        make_request("/v1/subscriptions/cancel", method="POST", headers=headers, body={"reason": "Testing fresh purchase"})

        # Initiate Purchase
        purchase_payload = {
            "planCode": "CANDIDATE_PRO",
            "billingCycle": "MONTHLY",
            "idempotencyKey": f"idem-test-{int(time.time())}"
        }
        status, data = make_request("/v1/subscriptions/purchase", method="POST", headers=headers, body=purchase_payload)
        order_id = data.get("data", {}).get("orderId") if isinstance(data, dict) else None
        log_test("Candidate Initiate Purchase (CANDIDATE_PRO)", status == 200 and order_id is not None)

        if order_id:
            # Generate UPI QR Payment Session
            status, data = make_request(f"/v1/subscriptions/payment-session/qr?orderId={order_id}", method="POST", headers=headers)
            upi_uri = data.get("data", {}).get("upiUri") if isinstance(data, dict) else None
            log_test("Generate Dynamic UPI QR Session", status == 200 and upi_uri is not None)

            # Check Session Status & TTL
            status, data = make_request(f"/v1/subscriptions/payment-session/{order_id}", headers=headers)
            ttl = data.get("data", {}).get("ttlRemainingSeconds") if isinstance(data, dict) else None
            log_test("Inspect Payment Session Status & Redis TTL", status == 200 and ttl is not None and ttl > 0)

            # Verify Payment & Activate
            verify_payload = {
                "orderId": order_id,
                "gatewayPaymentId": f"pay_mock_{int(time.time())}",
                "gatewaySignature": "mock_sig_valid",
                "paymentMethod": "UPI"
            }
            status, data = make_request("/v1/subscriptions/verify", method="POST", headers=headers, body=verify_payload)
            is_active = data.get("data", {}).get("status") == "ACTIVE" if isinstance(data, dict) else False
            log_test("Verify Payment & Activate Subscription", status == 200 and is_active)

            # Verify Active Subscription
            status, data = make_request("/v1/subscriptions/my", headers=headers)
            sub_status = data.get("data", {}).get("status") if isinstance(data, dict) else None
            log_test("Retrieve Current Active Subscription", status == 200 and sub_status == "ACTIVE")

            # Transaction History
            status, data = make_request("/v1/subscriptions/transactions", headers=headers)
            content = data.get("data", {}).get("content", []) if isinstance(data, dict) else []
            log_test("Retrieve User Transaction History", status == 200 and len(content) >= 1)

            # Cancel Subscription
            status, data = make_request("/v1/subscriptions/cancel", method="POST", headers=headers, body={"reason": "Test complete"})
            log_test("Cancel Active Subscription", status == 200)

    print(f"\n{CYAN}{BOLD}======================================================={RESET}")
    print(f"{BOLD}  VERIFICATION SUMMARY: {GREEN}{passed_tests} PASSED{RESET} | {RED if failed_tests > 0 else GREEN}{failed_tests} FAILED{RESET}")
    print(f"{CYAN}{BOLD}======================================================={RESET}\n")

    if failed_tests > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
