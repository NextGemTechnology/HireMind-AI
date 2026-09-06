# 🪐 HireMind AI (TalentIQ) — Enterprise AI Recruitment & Talent Intelligence Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge&logo=github)](https://github.com/AbhayGupta002/HireMind-AI)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-orange?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7.4-red?style=for-the-badge&logo=redis)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-7.5-black?style=for-the-badge&logo=apachekafka)](https://kafka.apache.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue?style=for-the-badge&logo=kubernetes)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

**HireMind AI** (formerly TalentIQ) is an enterprise-grade, full-stack SaaS recruitment intelligence and talent management platform. Built with a Spring Boot 3 backend and React 18 frontend, HireMind AI provides real-time AI-powered candidate-to-job matching, automated resume parsing, interactive AI HR career copilot assistance, full-duplex WebSocket messaging, automated notification management, and dedicated role-isolated administrative governance centers.

---

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Technology Stack](#-technology-stack)
3. [System Architecture](#-system-architecture)
4. [User Roles & Permissions (RBAC)](#-user-roles--permissions-rbac)
5. [Complete Application Workflow](#-complete-application-workflow)
6. [Core Features & Modules](#-core-features--modules)
7. [Authentication & Authorization Flow](#-authentication--authorization-flow)
8. [Frontend / Backend / Database Data Flow](#-frontend--backend--database-data-flow)
9. [Important API Groups](#-important-api-groups)
10. [Project Directory Structure](#-project-directory-structure)
11. [Local Development Setup](#-local-development-setup)
12. [Docker & Kubernetes Deployment](#-docker--kubernetes-deployment)
13. [Environment Variable Configuration](#-environment-variable-configuration)
14. [Testing & Verification Commands](#-testing--verification-commands)

---

## 💡 Project Overview

HireMind AI optimizes the end-to-end recruitment lifecycle for candidates, HR recruiters, company administrators, and platform operations teams:

- **Candidates** build smart profiles, parse resumes, explore jobs with composite search filtering, receive real-time 85%+ AI match scores, apply in one click, track pipelines, and chat directly with HR recruiters.
- **HR Recruiters** post and manage job listings, review candidate pipelines, inspect applicant profiles, tag/flag top talent, schedule interviews, collaborate with internal teams, and engage candidates via real-time WebSocket messaging.
- **Company & SaaS Executives** manage company seals, issue verified recruiter badges, inspect revenue telemetry, review RFC 6238 TOTP security logs, oversee tenant operations, and monitor platform health via isolated Admin portals.

---

## 🛠️ Technology Stack

| Component | Technologies & Frameworks |
|---|---|
| **Backend Core** | Java 17, Spring Boot 3.3.4, Spring Security 6, Spring Data JPA, Hibernate |
| **Database & ORM** | MySQL 8.4 (InnoDB, Composite Indexing, Flyway Database Migrations V1–V13) |
| **Caching & In-Memory Storage** | Redis 7.4 (OTP Storage, Sliding-Window Rate Limiting, Token Revocation Blacklist) |
| **Distributed Messaging & Streaming** | Apache Kafka 7.5, Zookeeper 7.5 |
| **Real-Time WebSockets** | STOMP protocol, SockJS client, Spring Messaging (`/ws-chat`, `/topic/messages`) |
| **Frontend UI** | React 18, TypeScript, Vite 8, Lucide React Icons, Axios |
| **Styling & Responsive System** | Pure Vanilla CSS modules with mobile-first `clamp()` dynamic layout scaling |
| **Containerization & Orchestration** | Docker, Docker Compose, Kubernetes (`k8s/`), Nginx Ingress |

---

## 🏗️ System Architecture

HireMind AI follows a **decoupled, multi-tiered microservices-ready architecture**:

```text
               +-------------------------------------------------------+
               |                  Client Applications                  |
               |  (React 18 SPA / Mobile Browsers / Desktop Portals)   |
               +---------------------------+---------------------------+
                                           |
                                   HTTP / REST / WS
                                           v
               +-------------------------------------------------------+
               |                  Nginx Reverse Proxy                  |
               |        (Rate Limiting, SSL Offloading, SPA Router)    |
               +---------------------------+---------------------------+
                                           |
                        +------------------+------------------+
                        |                                     |
                REST API Requests                     WebSocket Messages
                        v                                     v
   +---------------------------------------+   +-----------------------------------+
   |        Spring Boot 3 Backend          |   |       STOMP WebSocket Handler     |
   | (SecurityFilter, Controllers, Service) |   |    (Real-Time Direct & Group Chat)|
   +---+---------------+---------------+---+   +-----------------+-----------------+
       |               |               |                         |
       v               v               v                         v
+--------------+ +-----------+ +---------------+        +------------------+
|  MySQL 8.4   | | Redis 7.4 | | Apache Kafka  |        | In-App & Email   |
| (Database)   | | (Cache)   | | (Events Broker|        | Notifications    |
+--------------+ +-----------+ +---------------+        +------------------+
```

---

## 🔐 User Roles & Permissions (RBAC)

HireMind AI enforces strict **Role-Based Access Control (RBAC)** across 6 distinct user roles:

| Role | Access Scope | Portal Route | Primary Capabilities |
|---|---|---|---|
| `ROLE_CANDIDATE` | Candidate User | `/user-login` | Build profile, upload resume, view AI job recommendations, submit applications, track application status, chat with HR recruiters, build online portfolio. |
| `ROLE_HR` | HR Recruiter | `/hr-login` | Create & manage job postings, review applicant pipelines, shortlist/flag candidates, schedule interviews, use AI Copilot, direct chat with candidates. |
| `ROLE_APP_DEVELOPER` | Platform Operations | `/admin/developer` | **Cyberpunk Terminal**: View JVM heap, GC telemetry, connection pool state, Redis active presence, run real-time diagnostic terminal commands, stream error logs. |
| `ROLE_SERVICE_TEAM` | Customer Support | `/admin/service-team` | **Support & Moderation Bureau**: Review pending company verification requests, inspect document proofs, issue verified badges, moderate users, handle support tickets. |
| `ROLE_COMPANY_ADMIN` | Corporate Admin | `/admin/company` | **Corporate Executive Suite**: Manage corporate branding, manage HR recruiter roster, issue verified recruiter tags, inspect company recruitment pipeline metrics. |
| `ROLE_SUPER_ADMIN` | SaaS Governance | `/admin/super-admin` | **Master Governance Center**: Inspect SaaS financial metrics (MRR/ARR), manage RFC 6238 TOTP 2FA security, view immutable forensic audit logs, manage platform tenants. |
| `ROLE_GUEST` | Unauthenticated | `/` | Browse public home page, search job listings, view public platform statistics. |

---

## 🔄 Complete Application Workflow

```text
[Candidate Workflow]
Register Account -> 4-Digit OTP Email Verification -> Complete Profile & Resume ->
Explore Jobs / View AI Recommendations -> Apply to Job -> Track Pipeline -> Real-Time HR Chat

[HR Recruiter Workflow]
Register HR Account -> Submit Company Verification -> Access HR Dashboard ->
Post Job Listing -> Review Applicant Profiles -> Shortlist / Flag Candidate ->
Schedule Interview -> Chat via WebSockets

[Admin Governance Workflow]
Dedicated Admin Login -> Authenticate Role & Token -> Access Role-Specific Center ->
Audit Telemetry / Moderate Verification / Manage Subscriptions & Security
```

---

## 🌟 Core Features & Modules

### 1. Real-Time Chat & Messaging System
- **Full-Duplex Communication**: Built using STOMP over SockJS (`/ws-chat`).
- **Database Retention**: All direct and group messages are permanently stored in MySQL.
- **Responsive Layout**: Mobile-first single-panel switching with a "← Back" button for seamless chat on mobile screens.

### 2. High-Concurrency Redis OTP & Rate Limiting Engine
- **$O(1)$ Performance**: Cryptographic 4-digit OTP codes cached in Redis with an automated 10-minute TTL.
- **Sliding-Window Rate Limiting**: Throttles OTP requests per email and per IP to prevent spam and abuse.
- **Brute-Force Protection**: Locks accounts temporarily after 5 invalid verification attempts.

### 3. AI Candidate Matching & Career Agent
- **AI Recommendation Engine**: Calculates candidate-to-job compatibility scores based on skills, experience, and profile attributes.
- **Prompt Safety Firewall**: Sanitizes natural language queries and defends against prompt injection.

### 4. Enterprise Company Verification & Badges
- **Verification Pipeline**: Service Team reviews submitted corporate documents.
- **Verified Badges**: Approved companies and recruiters display official gold verification seals.

### 5. Automated Notification Center
- **In-App Notifications**: Real-time bell counter and unread message notifications.
- **Transactional Emails**: Automated SMTP email dispatch for OTP verification, welcome messages, and password resets.

---

## 🔑 Authentication & Authorization Flow

```text
Client (Login Request) ---> AuthController (/v1/auth/login)
                                   |
                                   v
                      AuthenticationManager (Spring Security)
                                   |
                     +-------------+-------------+
                     |                           |
               (Credentials Valid)       (Invalid Credentials)
                     |                           |
                     v                           v
         Generate JWT Token + Roles        Return 401 Unauthorized
                     |
                     v
         Client Stores JWT Token
                     |
                     v
   Requests Include `Authorization: Bearer <token>`
                     |
                     v
  JwtAuthenticationFilter Validates Token & Redis Blacklist
```

- **JWT Revocation on Logout**: Revokes active JWT tokens in Redis for their remaining TTL.

---

## 📊 Frontend / Backend / Database Data Flow

```text
[React UI Component] 
        | (Axios Request)
        v
[Spring Boot Controller] 
        | (Service Call)
        v
[Service Layer] <---> [Redis 7.4 Cache]
        | (JPA Repository)
        v
[MySQL 8.4 Database]
```

---

## 🌐 Important API Groups

| API Path | Method | Description | Role Required |
|---|---|---|---|
| `/v1/auth/register` | `POST` | Register candidate or HR account | Public |
| `/v1/auth/login` | `POST` | Authenticate user & receive JWT | Public |
| `/v1/auth/send-otp` | `POST` | Dispatch 4-digit OTP code | Public |
| `/v1/auth/verify-otp` | `POST` | Verify OTP code & activate account | Public |
| `/v1/auth/logout` | `POST` | Revoke JWT token in Redis | Authenticated |
| `/v1/jobs` | `GET` | List & filter active job postings | Public |
| `/v1/jobs` | `POST` | Create a new job listing | `ROLE_HR`, `ROLE_COMPANY_ADMIN` |
| `/v1/applications` | `POST` | Submit job application | `ROLE_CANDIDATE` |
| `/v1/applications/my` | `GET` | Retrieve candidate's applications | `ROLE_CANDIDATE` |
| `/v1/chat/contacts` | `GET` | Retrieve chat contact directory | Authenticated |
| `/v1/chat/messages` | `GET` | Retrieve message history | Authenticated |
| `/v1/recommendations/jobs` | `GET` | Get AI job match recommendations | `ROLE_CANDIDATE` |
| `/v1/copilot/chat` | `POST` | Query AI HR Copilot assistant | `ROLE_HR` |
| `/v1/admin/developer/metrics` | `GET` | Retrieve system telemetry metrics | `ROLE_APP_DEVELOPER` |
| `/v1/admin/service-team/verifications`| `GET` | List company verification requests | `ROLE_SERVICE_TEAM` |
| `/v1/admin/super-admin/audit-logs` | `GET` | Search forensic audit logs | `ROLE_SUPER_ADMIN` |
| `/v1/public/stats` | `GET` | Get public platform statistics | Public |

---

## 📁 Project Directory Structure

```text
HireMind-AI/
├── docker-compose.yml              # Local multi-container orchestration
├── .env.example                    # Environment configuration template
├── README.md                       # Project documentation
├── k8s/                            # Production Kubernetes manifests
│   ├── 01-namespace.yaml           # Dedicated namespace
│   ├── 02-configmap-secrets.yaml   # ConfigMaps and secrets
│   ├── 03-redis-cluster.yaml       # Redis cache deployment
│   ├── 04-backend-deployment.yaml  # Spring Boot deployment
│   ├── 05-frontend-deployment.yaml # Nginx static SPA deployment
│   ├── 06-ingress-loadbalancer.yaml# Ingress controller configuration
│   └── 07-hpa.yaml                 # Horizontal Pod Autoscaling
├── talentiq-backend/               # Spring Boot 3 Backend Application
│   ├── Dockerfile                  # Container build instructions
│   ├── pom.xml                     # Maven dependencies
│   └── src/
│       ├── main/java/com/talentiq/
│       │   ├── ai/                 # AI Copilot, Agents, & Usage Logging
│       │   ├── config/             # Spring Security, Redis, WebSocket configs
│       │   ├── controller/         # REST API Controllers
│       │   ├── dto/                # Request/Response Data Objects
│       │   ├── model/              # JPA Entities (User, Job, Chat, Candidate...)
│       │   ├── repository/         # Spring Data Repositories
│       │   └── service/            # Business Logic Layer
│       └── main/resources/
│           ├── application.yml     # Application configuration
│           └── db/migration/       # Flyway SQL migrations (V1 - V13)
├── talentiq-frontend/              # React 18 SPA Frontend Application
│   ├── Dockerfile                  # Nginx production build
│   ├── package.json                # Dependencies & scripts
│   └── src/
│       ├── api/                    # Axios HTTP client & WebSocket setup
│       ├── components/             # Reusable UI components & Navigation
│       ├── context/                # AuthContext & ThemeContext
│       ├── css/                    # Modular Vanilla CSS styles
│       ├── pages/                  # Application views (Candidate, HR, Admin)
│       └── index.css               # Global responsive design system
└── scripts/
    └── test_all_apis.py            # Automated API testing script
```

---

## 💻 Local Development Setup

### Prerequisites
- **Java**: JDK 17+
- **Node.js**: v18+
- **Database**: MySQL 8.4+ & Redis 7.4+ (or run via Docker)
- **Build Tools**: Maven 3.8+ & npm 9+

### 1. Clone the Repository
```bash
git clone https://github.com/AbhayGupta002/HireMind-AI.git
cd HireMind-AI
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Backend (Spring Boot)
```bash
cd talentiq-backend
mvn clean spring-boot:run
```
*Backend runs on `http://localhost:8081`.*

### 4. Run Frontend (React + Vite)
```bash
cd talentiq-frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 🐳 Docker & Kubernetes Deployment

### Local Multi-Container Run with Docker Compose
```bash
# Build and launch all services (MySQL, Redis, Zookeeper, Kafka, Backend, Frontend)
docker compose up -d --build

# Inspect running containers
docker compose ps

# View backend logs
docker compose logs -f backend
```

### Kubernetes Production Deployment
```bash
# 1. Apply Namespace & Configs
kubectl apply -f k8s/01-namespace.yaml
kubectl apply -f k8s/02-configmap-secrets.yaml

# 2. Deploy Redis & Backend
kubectl apply -f k8s/03-redis-cluster.yaml
kubectl apply -f k8s/04-backend-deployment.yaml

# 3. Deploy Frontend & Ingress
kubectl apply -f k8s/05-frontend-deployment.yaml
kubectl apply -f k8s/06-ingress-loadbalancer.yaml

# 4. Enable Horizontal Pod Autoscaling (HPA)
kubectl apply -f k8s/07-hpa.yaml
```

---

## ⚙️ Environment Variable Configuration

Below is a template for the `.env` file (**never commit real secret values**):

```env
# Spring Profile
SPRING_PROFILES_ACTIVE=dev

# MySQL Database Settings
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=HireMeAI
MYSQL_USER=talentiq_user
MYSQL_PASSWORD=${MYSQL_PASSWORD}

# Redis Settings
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Broker Settings
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# JWT Configuration
JWT_SECRET=${JWT_SECRET_KEY}
JWT_EXPIRATION_MS=86400000

# SMTP Mail Settings
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=${MAIL_USERNAME}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_FROM=${MAIL_FROM}
MAIL_FROM_NAME="HireMind AI Platform"
```

---

## 🧪 Testing & Build Commands

### Backend Automated Unit Tests
```bash
cd talentiq-backend
mvn test
```

### Frontend Production Build Test
```bash
cd talentiq-frontend
npm run build
```

### Automated API Integration Test Suite
```bash
python3 scripts/test_all_apis.py
```

---

## 📄 License
Distributed under the **MIT License**.

---

### 👨‍💻 Developed & Maintained by
**Abhay Gupta** — [GitHub Profile](https://github.com/AbhayGupta002)
