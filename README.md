# 🪐 HireMind AI (TalentIQ) — Next-Gen AI Recruitment & Talent Intelligence Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge&logo=github)](https://github.com/AbhayGupta002/HireMind-AI)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-orange?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7.4-red?style=for-the-badge&logo=redis)](https://redis.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue?style=for-the-badge&logo=kubernetes)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

**HireMind AI** (formerly TalentIQ) is an enterprise-grade, full-stack AI recruitment intelligence platform designed to streamline hiring workflows, compute candidate-to-job match scores, parse resumes, provide RAG-powered HR AI interview assistance, offer real-time full-duplex chat messaging, automate applicant notifications, and deliver high-concurrency 4-digit OTP password recovery.

---

## 🚀 Core Platform Capabilities & Architecture

### ⚡ 1. High-Concurrency Redis OTP Engine & Rate Limiting (`10,000+ Users`)
- **$O(1)$ In-Memory Speed (`RedisOtpService.java`)**: OTPs are generated cryptographically and cached in Redis (`otp:code:<email>`) with an automated **10-minute TTL**, eliminating database lock contention during traffic surges.
- **Single-Use Destruction**: OTP is invalidated immediately upon successful verification to eliminate replay attacks.
- **Sliding-Window Rate Limiting in Redis**:
  - **Per-Email Throttle**: Max 3 OTP generation requests per 2 minutes.
  - **Per-IP Throttle**: Max 10 requests per minute from a single network.
- **Brute-Force Lockout Defense**: 5 consecutive invalid entries triggers an automated 15-minute security lockout.

### 📧 2. Automated Gmail SMTP Email Dispatch
- **Google App Password Integration**: Full TLS/STARTTLS support over `smtp.gmail.com:587`.
- **Asynchronous Fire-and-Forget Thread Pool**: Non-blocking email dispatch with zero impact on HTTP request latency.
- **Automated HTML Email Notifications**:
  - 🔑 **4-Digit OTP Password Reset Codes**
  - 🎉 **Account Registration & Welcome Letters**
  - 🛡️ **Login Security & Alert Notifications**

### 🚪 3. Role-Based Access Control (RBAC) & Dedicated Portal Routing
- **Candidate Portal** (`http://localhost:3000/user-login`): Candidate sign-in, profile building, 85%+ AI match scores, and application tracking.
- **HR Recruiter Portal** (`http://localhost:3000/hr-login`): Job publishing, candidate applicant desk, resume review, and pipeline tracking.
- **Dedicated Admin Portals** (`http://localhost:3000/admin-login`): Strict 1:1 RBAC isolation across 4 locked Admin roles (`/admin/developer`, `/admin/service-team`, `/admin/company`, `/admin/super-admin`).
- **Cross-Portal Protection**: Clean `401 Unauthorized` error responses prevent user enumeration and enforce strict backend security boundaries.

---

## 👑 Enterprise Admin SaaS Platform Architecture & RBAC Isolation

HireMind features a **hardened, multi-tenant Admin SaaS Architecture** built around 4 locked Admin roles, decoupled credential storage tables, strict backend Role-Based Access Control (RBAC), and dedicated, visually isolated admin portals.

### 🔒 1. The 4 Locked Admin Roles & Dedicated Portals

| Admin Role | Canonical Route | Database Table | Visual Theme & Architecture | Core Capabilities & Governance |
|---|---|---|---|---|
| **`ROLE_APP_DEVELOPER`** | `/admin/developer` | `app_dev_credentials` | **Cyberpunk / Matrix Dark Terminal** (`#10B981` Emerald / `#06B6D4` Cyan) | • **Cluster Telemetry**: JVM Heap, thread counts, GC pauses, MySQL HikariPool connection state, and live candidate/HR Redis presence.<br>• **AI Developer Terminal**: Real-time diagnostic terminal runner with ANSI syntax highlighting and tool execution chips (`READ_LOGS`, `READ_METRICS`, `CHECK_DATABASE`, `ANALYZE_QUERY`, `CHECK_DEPLOYMENT`).<br>• **Error Log Tracing**: Filterable Spring Boot log streamer.<br>• **Developer Provisioning**: Developer team invite dispatch. |
| **`ROLE_SERVICE_TEAM`** | `/admin/service-team` | `service_team_credentials` | **Operations & Customer Success Desk** (`#6366F1` Indigo / `#F59E0B` Amber) | • **Corporate Verification Queue**: Pending company registrations with document preview, corporate registry validation, and 1-click "Approve & Issue Badge" or "Reject".<br>• **User & Recruiter Moderation Bureau**: Candidate & HR search, dossier inspect modal, and account block/unblock with audit notes.<br>• **Customer Support Tickets Desk**: Priority-tagged support queue (High/Medium/Low SLA urgency), official customer reply composer, and resolution tracking. |
| **`ROLE_COMPANY_ADMIN`** | `/admin/company` | `company_credentials` | **Corporate Executive Workspace** (`#2563EB` Royal Blue / `#38BDF8` Sky) | • **Enterprise Branding & Seal**: Corporate profile management, employee size, industry, and Gold Verified Corporate Partner badge.<br>• **HR Recruiter Team Roster**: Recruiter management table with verified recruiter badge issuing.<br>• **Milestone Roadmap**: Kanban sprint goals and task assignment modal.<br>• **Recruitment Funnel**: Live job postings and candidate application metrics.<br>• **AI Executive Copilot**: Natural language team productivity assistant. |
| **`ROLE_SUPER_ADMIN`** | `/admin/super-admin` | `user_credentials` | **Master Governance & Security Center** (`#8B5CF6` Violet / `#F43F5E` Rose Gold) | • **SaaS Financial Engine**: MRR ($14,200.00), ARR ($170,400.00), active tenant subscriptions, and plan tier breakdown.<br>• **TOTP 2FA Security Center**: RFC 6238 TOTP QR code generator, live 6-digit authenticator verification, and Step-Up enforcement.<br>• **Forensic Audit Trail**: Searchable immutable audit event ledger with IP address, actor, and outcome.<br>• **Global Tenant Directory**: Enterprise tenant registry and lockdown control. |

---

### 🛡️ 2. Security Infrastructure & RBAC Mechanics
- **Decoupled Credential Tables**: Admin accounts are stored in isolated database tables (`app_dev_credentials`, `service_team_credentials`, `company_credentials`, `user_credentials`), preventing privilege escalation across admin tiers.
- **Server-Authenticated Routing**: Post-login and 2FA redirects derive exclusively from the server-authenticated `roles` array returned in the backend JSON payload, bypassing client dropdown state.
- **Strict ProtectedRoute Barrier**: Navigating to an unauthorized admin URL renders an **Access Restricted** barrier displaying the user's active identity, active role, and a direct 1-click button to navigate to their authorized portal (`Go to My Portal →`).
- **RFC 6238 TOTP Multi-Factor Authentication**: SuperAdmin accounts support 2FA using Google Authenticator, Authy, or 1Password with 6-digit validation and step-up verification.
- **Immutable Forensic Audit Logging**: High-privilege administrative actions are automatically persisted to the `audit_logs` table with actor user ID, email, IP address, user agent, and timestamp.

### 💬 4. Full-Duplex Real-Time Candidate-to-HR Chat Desk
- **SockJS + STOMP Messaging**: WebSocket pipeline over Nginx with persistent fallback.
- **HR Messaging Console (`/hr-messages`)**: WhatsApp-style bottom-anchored input bar, unread candidate counters, and verified candidate profile drawer.
- **Global Toast Alerts (`HrGlobalNotificationToast`)**: Floating alerts notifying recruiters of new candidate messages across all pages.
- **Permanent Database Retention**: Zero optimistic duplicate messages; guaranteed MySQL persistence across page reloads.

### 🤖 5. AI Candidate Career Agent & 85%+ Instant Match Engine
- **Conversational Career Agent (`/recommendations`)**: Natural language queries (*"suggest me java developer jobs"*, *"match my resume to active jobs"*).
- **Safety Firewall**: Built-in prompt injection defense and query sanitization.
- **Composite Indexing**: Optimized MySQL schema with multi-column composite indexes ensuring sub-millisecond query latency.

### 🛡️ 6. Instant Token Revocation & Blacklisting on Logout
- **Redis Token Destruction Engine (`TokenBlacklistService.java`)**: Revokes JWT access tokens in Redis for their remaining TTL.
- **Filter-Level Interception**: `JwtAuthenticationFilter` rejects blacklisted tokens with `401 Unauthorized`. Frontend synchronously clears both `localStorage` and `sessionStorage`.

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
|---|---|
| **Backend Framework** | Java 17, Spring Boot 3.3.4, Spring Security 6, Spring Data JPA, Hibernate |
| **Real-Time Communication** | STOMP, SockJS, WebSockets, Spring Messaging |
| **Database & Caching** | MySQL 8.4, Redis 7.4 (OTP Caching, Token Blacklisting, Rate Limiting), Flyway Migrations |
| **Frontend Framework** | React 18, TypeScript, Vite 8, Tailwind CSS, Lucide React Icons, Axios |
| **Load Balancing & Proxy** | Nginx Reverse Proxy (Upstream keepalive, gzip compression, rate limiting) |
| **Cloud & Orchestration** | Kubernetes (`k8s/`), Horizontal Pod Autoscalers (HPA), Docker Compose |

---

## 📁 Directory Structure

```text
HireMind-AI/
├── docker-compose.yml              # Local multi-container Docker orchestration
├── .env.example                    # Environment variable configuration template
├── k8s/                            # Kubernetes production manifests
│   ├── 01-namespace.yaml           # Dedicated hiremind-ai namespace
│   ├── 02-configmap-secrets.yaml   # ConfigMaps and secret placeholders
│   ├── 03-redis-cluster.yaml       # High-performance Redis deployment
│   ├── 04-backend-deployment.yaml  # Spring Boot deployment with health probes
│   ├── 05-frontend-deployment.yaml # Nginx static SPA frontend
│   ├── 06-ingress-loadbalancer.yaml# Nginx Ingress with SSL & least_conn
│   └── 07-hpa.yaml                 # Horizontal Pod Autoscalers (3 to 20 replicas)
├── talentiq-backend/               # Spring Boot 3 Java Backend
│   ├── src/main/java/com/talentiq/
│   │   ├── config/                 # RedisConfig, SecurityConfig, WebSocketConfig
│   │   ├── controller/             # AuthController, JobController, ChatController...
│   │   ├── dto/                    # Request/Response Data Transfer Objects
│   │   ├── infrastructure/         # MailService, RateLimitFilter
│   │   ├── model/                  # JPA Entities (User, Candidate, Job, ChatMessage...)
│   │   ├── repository/             # Spring Data JPA Repositories
│   │   ├── security/               # JWT Token Service, Blacklist Service
│   │   └── service/                # Business Logic (AuthServiceImpl, RedisOtpService...)
│   └── src/main/resources/         # application.yml, Flyway migrations (V1 - V13)
├── talentiq-frontend/              # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components & navigation
│   │   ├── pages/                  # Login, Register, HrMessages, UserMessages, Jobs...
│   │   └── api/                    # Axios API client & WebSocket connections
└── scripts/
    └── test_all_apis.py            # Comprehensive 44-endpoint automated test suite
```

---

## ⚙️ Quick Start (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/AbhayGupta002/HireMind-AI.git
cd HireMind-AI
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
SPRING_PROFILES_ACTIVE=dev
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=HireMeAI
MYSQL_USER=talentiq_user
MYSQL_PASSWORD=your_secure_db_password

REDIS_HOST=redis
REDIS_PORT=6379

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_gmail_address@gmail.com
MAIL_PASSWORD=your_16_character_google_app_password
MAIL_FROM=your_gmail_address@gmail.com
MAIL_FROM_NAME="HireMind AI Platform"

JWT_SECRET=your_ultra_secure_256_bit_jwt_secret_key
```

### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access the Applications
- 🌐 **Candidate Web Portal**: [http://localhost:3000/login](http://localhost:3000/login)
- 🏢 **HR Recruiter Portal**: [http://localhost:3000/hr-login](http://localhost:3000/hr-login)
- 🛡️ **Super Admin Portal**: [http://localhost:3000/admin-login](http://localhost:3000/admin-login)
- 🔌 **Backend REST API**: [http://localhost:8081/api](http://localhost:8081/api)
- 📊 **Actuator Health**: [http://localhost:8081/api/actuator/health](http://localhost:8081/api/actuator/health)

---

## ☸️ Kubernetes (Production Deployment)

Deploy the entire high-availability architecture with Horizontal Pod Autoscaling (HPA) to a Kubernetes cluster:

```bash
# 1. Apply Namespace, ConfigMaps & Secrets
kubectl apply -f k8s/01-namespace.yaml
kubectl apply -f k8s/02-configmap-secrets.yaml

# 2. Deploy Redis Cache & Backend Services
kubectl apply -f k8s/03-redis-cluster.yaml
kubectl apply -f k8s/04-backend-deployment.yaml

# 3. Deploy Frontend & Ingress Load Balancer
kubectl apply -f k8s/05-frontend-deployment.yaml
kubectl apply -f k8s/06-ingress-loadbalancer.yaml

# 4. Enable Horizontal Pod Autoscalers (Autoscale from 3 to 20 Pods)
kubectl apply -f k8s/07-hpa.yaml
```

---

## 🧪 Automated Testing & Verification

Run the full automated test suite verifying all 44 endpoints:

```bash
python3 scripts/test_all_apis.py
```

### Test Suite Coverage:
- ✅ Candidate, HR & Admin Registration & Login
- ✅ 4-Digit OTP Generation, Redis Caching, Verification & Password Reset
- ✅ RBAC Cross-Portal Rejections (401 Invalid Credentials)
- ✅ Job Publishing & Pipeline Status Updates
- ✅ AI Job Recommendations & Safety Firewall
- ✅ WebSocket Real-Time Chat & Contact Sync
- ✅ Redis Token Blacklisting & Session Revocation

---

## 📄 License
Distributed under the **MIT License**.

---

### 👨‍💻 Developed & Maintained by
**Abhay Gupta** — [GitHub Profile](https://github.com/AbhayGupta002)
