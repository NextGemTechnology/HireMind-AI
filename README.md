# 🪐 HireMind AI (TalentIQ) — Next-Gen AI Recruitment & Talent Intelligence Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge&logo=github)](https://github.com/AbhayGupta002/HireMind-AI)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-orange?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7.4-red?style=for-the-badge&logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

**HireMind AI** (formerly TalentIQ) is an enterprise-grade, full-stack AI recruitment intelligence platform designed to streamline hiring workflows, compute candidate-to-job match scores, parse resumes, provide RAG-powered HR AI interview assistance, offer real-time chat messaging, and automate applicant notifications.

---

## 🚀 Recent Core Technical Accomplishments

### 🤖 AI Candidate Career Agent & 85%+ Instant Match Engine
- **Interactive AI Career Agent (`/recommendations`)**: Real-time conversational agent where candidates can prompt for custom job lookups (e.g., *"suggest me java developer job"*) or automated resume analysis (e.g., *"based on my resume suggest me job"*).
- **Resume Center Guardrail**: Automatically verifies resume upload status at `/portfolio`. Prompts candidate to upload before executing AI matching.
- **Safety & Prompt Firewall**: Politely rejects off-topic prompts; detects script/database injection attempts and issues warnings before temporary access blocks.
- **Sub-Millisecond Query Optimization**: Database composite indexes (`V13__add_recommendation_composite_indexes.sql`), index-constrained SQL queries, and Redis caching ensure instant results at scale.

### 💬 Full-Duplex Candidate-to-HR Real-Time Chat System
- **Real-Time STOMP & WebSockets (`/messages` & `/hr-messages`)**: SockJS + STOMP messaging pipeline over Nginx proxy supporting text chat, WebRTC audio calls, typing indicators, and file/photo uploads (`.pdf`, `.docx`, `.png`, `.jpg`).
- **HR Candidate Messaging Desk (`/hr-messages`)**: WhatsApp-style bottom-anchored input bar, unread candidate blue-dot badges (`msg-unread-pill`), candidate verified profile drawer, right-click context menus (copy/delete), and clear chat confirmation modals.
- **2-Second Global Popup Alert (`HrGlobalNotificationToast`)**: Instant floating toast notification banner when an HR recruiter receives a candidate message while navigating any page.
- **4-Theme Selection Engine**: Toggle between **Cosmic Galaxy**, **Lunar Moon**, **Solar Daylight**, and **Cyber Obsidian** themes.
- **Permanent Database Chat Retention**: Fixed WebSocket client-side optimistic message duplication and guaranteed 100% MySQL persistence across browser refreshes.

### 🔐 4-Digit Email OTP Password Reset Recovery Flow
- **Multi-Step OTP State Machine**: 
  - **Step 1 (`POST /v1/auth/forgot-password`)**: Candidate, HR Recruiter, or Admin submits their registered `@gmail.com` address. Generates a cryptographically secure 4-digit numeric OTP (`password_reset_otp`) with a 10-minute expiry and dispatches a branded HTML email via `MailService`.
  - **Step 2 (`POST /v1/auth/verify-otp`)**: Verifies the 4-digit code in real-time with automated digit jumping inputs and 60-second resend countdown timer.
  - **Step 3 (`POST /v1/auth/reset-password`)**: Validates OTP, hashes new password with BCrypt, updates database credentials, clears OTP fields, and revokes all active refresh tokens and sessions.
  - **Step 4**: Visual success confirmation and one-click transition back to Sign In.

### 🚪 Dedicated Role-Based Portal Routes & Clean 401 Rejections
- **Independent Portal Entrypoints**:
  - `http://localhost:3000/login` — Dedicated Candidate Portal.
  - `http://localhost:3000/hr-login` — Dedicated HR Recruiter Portal.
  - `http://localhost:3000/admin-login` — Dedicated Super Admin Portal.
- **RBAC URL Synchronization**: 3D perspective flip cards with synchronized route switching and cross-portal rejection returning clean `401 Unauthorized ("Invalid email or password")` to prevent user enumeration.

### 🔑 Google OAuth & `@gmail.com` Domain Rule
- **Google OAuth Login**: One-click Google Sign-In (`POST /v1/auth/google`) auto-provisioning verified candidate or HR accounts.
- **Strict `@gmail.com` Rule**: Validation enforces that all registrations, password logins, and OAuth sign-ins strictly use `@gmail.com` email addresses (or `@talentiq.ai` for Platform Admins).

### 🛡️ Instant Token Invalidation & Blacklisting on Logout
- **Redis Token Destruction Engine (`TokenBlacklistService`)**: Upon `POST /v1/auth/logout`, the JWT access token is stored in Redis (`jwt:blacklist:<token>`) with remaining TTL and refresh tokens are revoked in MySQL.
- **Filter-Level Security Interception**: `JwtAuthenticationFilter` and `WebSocketAuthInterceptor` reject blacklisted token requests with `HTTP 401 Unauthorized`. Frontend wipes both `localStorage` and `sessionStorage`.

### 🌙 Unified Lunar Moon Theme
- **Full-Bleed Celestial Theme**: Applied uniform Lunar Moon glassmorphism theme across candidate routes:
  - `/my-applications` (*"Lunar Tracking Horizon"*, *"My Application Constellation"*, real-time counters: Total Applications, Interviewing, Offers Received, In Review).
  - `/recommendations` (Full-bleed cosmic background canvas).

---

## 🏢 Platform Features

### 🏢 HR Recruiter Portal
- **Live Job Publishing**: Post and manage technical job listings with skill tags, experience levels, and compensation.
- **Applicant Pipeline**: Progress applicants through stages (`APPLIED` ➔ `SCREENED` ➔ `INTERVIEWING` ➔ `OFFERED` ➔ `REJECTED`) with automated notifications.
- **Resume Downloader**: View candidate profiles and download verified resume PDFs.
- **RAG HR AI Copilot**: Generate interview questions, evaluate candidate fit, and synthesize summaries.
- **Candidate Messages Desk**: Real-time WhatsApp-style chat with unread counters and global alerts.

### 🎯 Candidate Applicant Portal
- ⚡ **AI Match Scoring (85%+ Fit)**: Automated skill compatibility scoring comparing parsed resume keywords against active HR job postings.
- **Interactive AI Career Agent**: Conversational agent for customized job searches and resume analysis.
- **3D Portfolio Showcase**: Project demos, verified skills, and GitHub repository links.
- **Application Constellation Tracker**: Live stage tracking across active HR pipelines.
- **Recruiter Chat Desk**: Direct messaging with hiring managers, tick acknowledgements, and WebRTC audio calling.

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
|---|---|
| **Backend Framework** | Java 17, Spring Boot 3.3.4, Spring Security 6, Spring Data JPA, Hibernate |
| **Real-Time & WebSockets** | STOMP, SockJS, WebRTC (Audio Calling), Spring Messaging |
| **Database & Caching** | MySQL 8.4, Redis 7.4 (Token Blacklisting & Caching), Flyway Migrations (`V1` to `V13`) |
| **Frontend Framework** | React 18, TypeScript, Vite 8, Lucide React Icons, Axios |
| **Security & Auth** | JWT with Redis Blacklisting, Google OAuth 2.0, Strict `@gmail.com` Domain Validation |
| **Containerization** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## ⚙️ Quick Start with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/AbhayGupta002/HireMind-AI.git
   cd HireMind-AI
   ```

2. Launch full-stack environment (MySQL, Redis, Backend, Frontend):
   ```bash
   docker compose up -d --build
   ```

3. Access the web applications:
   - **Frontend Application**: `http://localhost:3000`
   - **Backend API Base**: `http://localhost:8081/api`
   - **Swagger API Docs**: `http://localhost:8081/swagger-ui.html`

---

## 🔑 Quick Demo Login Credentials

Login with any `@gmail.com` address or use pre-configured test roles:

| Role | Email | Access Scope |
|---|---|---|
| 🎯 **Candidate** | `candidate.alex@gmail.com` | Job Search, AI Matches, Career Agent, Application Tracker, 3D Portfolio, Chat |
| 🏢 **HR Recruiter** | `recruiter.hr@gmail.com` | Job Posting, Candidate Applicants, Candidate Messages, Resume Review, HR Copilot |
| 🛡️ **Super Admin** | `admin.talentiq@gmail.com` | Platform Metrics, User Management, Verification |

---

## 📡 Key REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/v1/auth/google` | Google OAuth Login / Fast Registration | Public (`@gmail.com`) |
| `POST` | `/v1/auth/login` | Authenticate user & issue JWT | Public (`@gmail.com`) |
| `POST` | `/v1/auth/logout` | Revoke refresh tokens & blacklist JWT in Redis | Bearer JWT |
| `GET` | `/v1/recommendations/matches` | Get 85%+ AI-matched jobs for candidate | Candidate Only |
| `POST` | `/v1/recommendations/agent/chat` | Chat with AI Candidate Career Agent | Candidate Only |
| `GET` | `/v1/chat/conversations/{userId}` | Get message history with user | Authenticated |
| `POST` | `/v1/chat/messages` | Send chat message (REST fallback) | Authenticated |
| `POST` | `/v1/chat/upload` | Upload chat file/photo attachment | Authenticated |
| `GET` | `/v1/applications/hr` | List candidate applicants for HR | HR Only |
| `PUT` | `/v1/applications/{id}/status` | Update applicant hiring stage | HR Only |

---

## 📄 License

Distributed under the **MIT License**.

---

### 👨‍💻 Developed & Maintained by
**Abhay Gupta** — [GitHub Profile](https://github.com/AbhayGupta002)
