# 🛡️ RepoLens

<p align="center">
  <img src="client/public/favicon.svg" width="84" height="84" alt="RepoLens Logo" />
</p>

<p align="center">
  <strong>AI-Assisted Code Security Posture, Automated Vulnerability Remediation & Architecture Intelligence Engine</strong>
</p>

<p align="center">
  <a href="https://github.com/sayanthkv/Repolens/actions/workflows/ci.yml"><img src="https://github.com/sayanthkv/Repolens/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="#-key-features"><img src="https://img.shields.io/badge/Security-Automated_Scans-emerald?style=for-the-badge" alt="Security Scans" /></a>
  <a href="#-architecture--tech-stack"><img src="https://img.shields.io/badge/Stack-MERN_%2B_TS_%2B_AI-blue?style=for-the-badge" alt="MERN + TypeScript + AI Stack" /></a>
  <a href="#-license"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.io" />
</p>

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Detection Methodologies (AST vs. Regex)](#-detection-methodologies-ast-vs-regex)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Security Design Decisions](#-security-design-decisions)
- [Benchmarks & Performance](#-benchmarks--performance)
- [Limitations & Scope](#-limitations--scope)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [API Reference](#-api-reference)
- [Deployment Guide](#-deployment-guide)
- [Development Roadmap Status](#-development-roadmap-status)
- [License](#-license)

---

## 🔍 Overview

**RepoLens** is like Grammarly, but for code security. It acts as an automated DevSecOps assistant that bridges the gap between raw, cryptic security warnings and real developer productivity. 

Instead of dumping confusing rule identifiers (e.g. `CWE-78: Improper Neutralization of Special Elements used in an OS Command`), RepoLens:
1. Explains the problem in **plain, simple English** without confusing jargon.
2. Clearly highlights the **vulnerable line** in your code with high-contrast visual indicators.
3. Provides a **one-click AI Auto-Remediation button** that automatically creates a branch, applies the safe fix, and opens a ready-to-merge Pull Request directly on GitHub!

---

## ✨ Key Features

- **🔑 Leaked Secret Detection & Shannon Entropy**:
  - Catches hardcoded API keys, private tokens, passwords, AWS credentials, Stripe keys, and `.env` files.
  - **Smart Placeholder Filtering**: Automatically recognizes and ignores template/documentation strings (like `mongodb+srv://<username>:<password>@cluster...` or `username:password`) to eliminate false positives.
  - Zero-exposure token masking (`ghp_1234...` $\rightarrow$ `ghp_12****cdef`).
- **⚡ 1-Click AI Auto-Remediation (Create Fix PR)**:
  - Generates ready-to-merge Pull Requests directly on GitHub using the Git Data API.
  - Safe, validated JSON updates for `package.json` that preserve formatting and prevent broken CI/Vercel builds.
- **📉 Security Regression Detection**:
  - Automatically calculates score delta across commits (`scoreDelta = currentScore - previousScore`).
  - Displays prominent alerts if a new commit drops your score, with an instant filter to isolate newly introduced regressions.
- **🛡️ Unsafe Code Pattern Analysis (AST)**:
  - Identifies dangerous patterns like OS command injection in `child_process.exec()`/`execSync()` with template literals, dynamic `eval()`, and missing security headers (`helmet`).
- **📦 Dependency Vulnerability Scanning (OSV API + In-Memory Cache)**:
  - Matches installed npm packages against the Open Source Vulnerabilities (OSV) database for known CVEs.
  - Built-in 1-hour TTL cache minimizes redundant network calls and guarantees fast re-scans.
- **📋 CycloneDX v1.5 SBOM Generation**:
  - One-click export of industry-standard Software Bill of Materials (SBOM) in JSON format.
- **⚖️ Open Source License Compliance**:
  - Categorizes package licenses into **Permissive** (MIT, Apache-2.0, BSD), **Weak Copyleft** (LGPL, MPL), and **Strong Copyleft** (GPL, AGPL) to prevent commercial license contamination.
- **💬 Automated PR Security Comments**:
  - Listens to GitHub `pull_request` webhooks and automatically posts security audit summaries on every pull request.
- **🗺️ Interactive Architecture Summaries**:
  - Generates system architecture breakdowns and dynamic Mermaid.js diagrams from repository source code.
- **💬 Ask Repo AI (RAG Codebase Chat)**:
  - Semantic code chunking and retrieval to answer natural-language questions about your codebase with cited file and line ranges.
- **⚡ In-Process MongoDB Queue**:
  - Zero Redis requirement. Scans run asynchronously in the background backed directly by MongoDB with automatic crash recovery.
- **🌙 Unified Dark Glassmorphic UI & Guided Workflows**:
  - Consistent `#080910` / `#0c0e18` card system across Overview, Repositories, Findings, Dependencies, Ask AI, and Settings.
  - Real-time Socket.io scan streaming, minimal circular loader, repository-tagged Findings view, direct **Scan** auto-start vs. manual **Audit** navigation, and actionable toast notifications (including next-step PR review links).

---

## 🔬 Detection Methodologies

To balance precision and scan speed, RepoLens combines signature matching, Shannon entropy, and external advisory feeds:

| Detection Target | Analysis Method | Engine / Rule | Why This Method? |
| :--- | :---: | :--- | :--- |
| **Command Injection** | **Regex Pattern** | `PAT-CMD-INJECTION` (`patternScanner.ts`) | Flags `child_process.exec`/`execSync` using template interpolation or `+` concatenation while skipping test files. |
| **Dynamic Code Execution** | **Regex Pattern** | `PAT-EVAL` (`patternScanner.ts`) | Flags `eval()` and `new Function()` calls in `.js/.ts/.jsx/.tsx` sources. |
| **Missing Security Headers** | **File Heuristic** | `PAT-MISSING-HELMET` (`patternScanner.ts`) | Checks Express entrypoints (`express()`) for missing `helmet()` middleware. |
| **Hardcoded Secrets & Tokens** | **Regex + Entropy** | `SECRET_RULES` + `calculateShannonEntropy` | Detects AWS (`AKIA...`), GitHub (`ghp_...`), Google (`AIza...`), Stripe (`sk_live_...`), JWT secrets, and high-entropy assignments. |
| **Database Connection Strings** | **Regex + Heuristic** | `SEC-MONGODB-URI` + Placeholder Filter | Detects exposed MongoDB URIs while ignoring template examples (`<username>:<password>`). |
| **Known Vulnerable Dependencies**| **External DB** | OSV.dev Batch Query API + 1h TTL Cache | Resolves exact versions from `package.json` and `package-lock.json` against the Open Source Vulnerabilities database. |
| **License Compliance** | **Semantic Map** | SPDX Identifier Matrix | Categorizes package licenses into Permissive (MIT/Apache), Weak Copyleft (MPL/LGPL), and Strong Copyleft (GPL/AGPL). |

---

## 🏗️ Architecture & Tech Stack

RepoLens is built on the **MERN** stack (MongoDB, Express, React 19, Node.js) extended with **TypeScript**, **Socket.io**, and configurable **LLM providers** across three workspaces:

```
repolens/
├── client/              # React 19 SPA (Vite, React Router v7, Tailwind CSS, Lucide, Recharts, Mermaid.js)
├── server/              # Node.js + Express (TypeScript, MongoDB/Mongoose, Socket.io)
└── shared/              # Centralized TypeScript types, Zod schemas, and score formulas
```

- **Frontend**: React 19, Vite, React Router v7, Tailwind CSS, Lucide Icons, Recharts, Mermaid.js.
- **Backend**: Node.js, Express, TypeScript, Mongoose, Socket.io, Vitest, Pino structured logger.
- **Database**: MongoDB (User profiles, connected repositories, scan history, findings, and queue jobs).
- **Embedded Queue**: Custom `MongoScanQueue` that processes background scan jobs with concurrency limits without external Redis dependencies.
- **Security**: AES-256-GCM token encryption, Double-Submit CSRF cookie protection, signed HTTP-only cookies, and multi-tenant isolation.

---

## 🔐 Security Design Decisions

RepoLens adheres to secure-by-design principles throughout its lifecycle. For complete architectural documentation, review [SECURITY.md](SECURITY.md).

- **Webhook Signature Verification**: GitHub webhooks are cryptographically authenticated using `X-Hub-Signature-256` HMAC-SHA256, verified using Node's `crypto.timingSafeEqual` to eliminate timing attack vectors.
- **Token Protection at Rest**: GitHub OAuth access tokens are encrypted using **AES-256-GCM** with a distinct 12-byte initialization vector (IV) and authentication tag per entry.
- **Strict Rate Limiting**: Expensive and AI endpoints are rate-limited via `express-rate-limit` (`/api/repos/:id/scans`: 10/min, `/api/repos/:id/summary`: 5/min, `/api/repos/:id/ask`: 15/min, `/api/findings/:id/create-pr`: 10/min).
- **Server Hardening**: The Express server enforces `helmet` security headers, 1MB payload limits, Double-Submit CSRF (`X-CSRF-Token`), signed `HttpOnly` session cookies, multi-tenant IDOR isolation (`404` on cross-user access), and a strict CORS allowlist restricted to `CLIENT_URL`.
- **Minimal OAuth Scopes**: RepoLens requests only the permissions strictly required:
  - `read:user` & `user:email`: User identity and profile authentication.
  - `public_repo`: Reading public code files for analysis, configuring webhooks, and opening remediation pull requests.
- **AI Data Privacy & Prompt Isolation**:
  - Only isolated, sanitized snippets of flagged lines are sent to the configured LLM provider for explanation and fix generation.
  - High-entropy tokens are masked *prior* to database storage and LLM transmission.
  - Repositories are processed ephemerally in-memory buffers; code is never executed on the host.
  - **Human-in-the-Loop**: RepoLens *never* auto-merges fixes into main branches; it creates isolated remediation pull requests for developer review.

---

## 📊 Benchmarks & Performance

Reproducible scan runs executed on 2026-11-26 against fresh clones of standard vulnerable Node.js fixtures and the RepoLens monorepo (full commit hashes, reproduction steps, and line-by-line manual review in [docs/BENCHMARKS.md](docs/BENCHMARKS.md)):

| Test Suite / Target | Commit | Files Scanned | Total Duration | Findings | Manual Review |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **OWASP NodeGoat** | `c5cb68a` | 92 | 0.873s | 23 | 22 true positives, 1 false positive (`eval()` comment) |
| **Appsecco DVNA** | `9ba473a` | 124 | 0.733s | 29 | 27 true positives, 2 false positives (`password == cpassword`) |
| **RepoLens (Self-Scan)** | `8b78703` | 115 | 0.563s | 33 | 7 OSV dev/build advisories, 1 Mermaid SVG render, plus self-matches on test fixtures, rule strings, and local `.env` |

> Results are from a small fixture set and are not a claim of general accuracy.

---

## ⚠️ Limitations & Scope

To ensure realistic production expectations, RepoLens documents the following operational boundaries:

1. **Ecosystem Scope**: Static code pattern analysis and dependency checking currently support the **JavaScript & TypeScript (Node.js/npm)** ecosystem (`package.json`, `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`). Support for Python (`requirements.txt`) and Java (`pom.xml`) is planned for future milestones.
2. **File Size Limits**: Files exceeding **500 KB** or minified production bundles (`.min.js`, `.min.css`, `.map`, `dist/`) are skipped during scans to prevent ReDoS and excessive memory consumption.
3. **Scan Depth**: `patternScanner.ts` currently uses single-file RegExp rules rather than full AST traversal or cross-module taint tracking, which can occasionally match pattern strings inside comments (as documented in [docs/BENCHMARKS.md](docs/BENCHMARKS.md)). Upgrading to `@babel/parser` AST traversal is planned.
4. **Third-Party AI Dependency**: The AI Auto-Remediation and "Ask Repo" features require active connectivity to the configured LLM provider (Google Gemini, Anthropic Claude, or OpenAI).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or v20.x+)
- **npm** (v9.x+)
- **MongoDB** (Local instance or MongoDB Atlas cluster URI)

### 2. Installation
```bash
git clone https://github.com/sayanthkv/repolens.git
cd repolens
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:3000

# MongoDB (Local or Atlas)
MONGODB_URI=mongodb://localhost:27017/repolens

# GitHub OAuth App
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:4000/api/auth/github/callback

# Encryption & Session Keys
SESSION_SECRET=your_32_char_random_session_secret
TOKEN_ENCRYPTION_KEY=your_base64_32_byte_key

# Webhook & LLM Settings
WEBHOOK_BASE_URL=http://localhost:4000
LLM_PROVIDER=gemini # or "anthropic" | "openai"
LLM_API_KEY=your_llm_api_key
LLM_MODEL=gemini-2.5-flash # or "claude-3-5-sonnet-latest" | "gpt-4o"
```

> **Generating Security Keys via Terminal:**
> - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
> - `TOKEN_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### 4. GitHub OAuth App Setup
1. Go to your GitHub account **Settings $\rightarrow$ Developer Settings $\rightarrow$ OAuth Apps $\rightarrow$ New OAuth App**.
2. **Application name**: `RepoLens (Dev)`
3. **Homepage URL**: `http://localhost:3000`
4. **Authorization callback URL**: `http://localhost:4000/api/auth/github/callback`
5. Copy the generated **Client ID** and **Client Secret** into your `.env` file.

### 5. Start Development
```bash
npm run dev
```
- **Web Interface**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000](http://localhost:4000)

---

## 🛠️ Available Scripts

Run these commands from the root directory:

| Script | Description |
| :--- | :--- |
| `npm run dev` | Runs both the client (`:3000`) and server (`:4000`) concurrently in watch mode |
| `npm run build` | Builds `@repolens/shared`, `@repolens/server`, and bundles `@repolens/client` with Vite |
| `npm run start` | Runs the production server (`node server/dist/index.js`) |
| `npm run test` | Executes the Vitest test suite in `@repolens/server` (35 unit tests) |
| `npm run lint` | Runs ESLint across all packages |
| `npm run format` | Auto-formats code with Prettier |

---

## 📡 API Reference

All protected endpoints require authentication via signed session cookies and CSRF headers (`X-CSRF-Token`).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/github` | Initiates GitHub OAuth authentication |
| `GET` | `/api/auth/github/callback` | Exchanges code for access token and logs in |
| `GET` | `/api/auth/me` | Returns current user profile |
| `POST` | `/api/auth/logout` | Clears session cookies |
| `GET` | `/api/repos` | Lists all connected repositories |
| `POST` | `/api/repos` | Connects a new GitHub repository |
| `DELETE` | `/api/repos/:id` | Disconnects repository and removes webhooks |
| `POST` | `/api/repos/:id/scans` | Triggers an asynchronous security scan (rate-limited) |
| `GET` | `/api/repos/:id/scans` | Lists past scans and score history |
| `GET` | `/api/scans/:id` | Returns scan details and list of findings |
| `PATCH` | `/api/findings/:id` | Updates finding status (`open`, `resolved`, `ignored`) |
| `POST` | `/api/findings/:id/create-pr` | Creates a 1-click remediation PR on GitHub (rate-limited) |
| `GET` | `/api/scans/:id/sbom` | Exports CycloneDX v1.5 JSON SBOM |
| `GET` | `/api/scans/:id/licenses` | Returns license compliance breakdown |
| `POST` | `/api/repos/:id/ask` | Queries the codebase via RAG with cited answers (rate-limited)|
| `GET` | `/api/repos/:id/summary` | Returns or generates architecture breakdown |
| `POST` | `/api/webhooks/github` | Webhook endpoint for push and pull_request events |
| `GET` | `/api/health` | Service health status check |

---

## 🚢 Deployment Guide

### Option 1: Split Deployment (Vercel + Render)

- **Frontend (Vercel)**:
  - Framework Preset: `Vite`
  - Root directory: `client`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment Variable: `VITE_API_URL=https://your-api.onrender.com`
  - *Note: SPA routing rewrites are pre-configured in `client/vercel.json`.*

- **Backend (Render / Railway)**:
  - Root directory: `.` (or `server`)
  - Build command: `npm run build`
  - Start command: `node server/dist/index.js`
  - Environment Variables:
    - `NODE_ENV=production`
    - `CLIENT_URL=https://your-app.vercel.app`
    - `MONGODB_URI=mongodb+srv://...`
    - `GITHUB_OAUTH_CALLBACK_URL=https://your-api.onrender.com/api/auth/github/callback`
    - `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `LLM_API_KEY`, etc.

### Option 2: Single Container (Docker / Monolithic)

In production (`NODE_ENV=production`), the Express server in `server/src/app.ts` automatically serves the compiled frontend (`client/dist`):

```bash
npm run build
npm run start
```
The entire application will be live directly on `PORT=4000`.

---

## 🗺️ Development Roadmap Status

| Phase | Milestone | Status | Description |
| :--- | :--- | :---: | :--- |
| **Phase 1: Security Intelligence** | **Repository Security Score** | ✅ Built | 0–100 weighted security score computed on every scan |
| | **Security Regression Detection** | ✅ Built | Score delta calculation, regression drop alerts, and new-issue isolation |
| | **False Positive Management** | ✅ Built | Status updating (`open`, `resolved`, `ignored`) with score recalculation |
| | **Improved Scan History** | ✅ Built | Commit history, trigger tags, score trends, and past finding inspection |
| **Phase 2: AI Intelligence** | **AI Auto-Remediation** | ✅ Built | 1-click GitHub Pull Request creation with automated branches & safe JSON patches |
| | **Advanced Ask Repo** | ✅ Built | Semantic RAG code chunking with contextual streaming LLM answers |
| | **Attack Path Analysis** | ⏳ Roadmap | Cross-file attack path graph modeling |
| | **Code Change Impact Analysis** | ⏳ Roadmap | Git diff blast-radius and downstream impact analysis |
| **Phase 3: GitHub Automation** | **GitHub Integration** | ✅ Built | OAuth login, repository syncing, and push/PR webhooks |
| | **Pull Request Security Reviews** | ✅ Built | Automated security comments posted on GitHub PRs with score & findings |
| | **GitHub Actions CI Workflow** | ✅ Built | Automated CI pipeline (`.github/workflows/ci.yml`) for lint, tests, and builds |
| **Phase 4: Advanced Security** | **SBOM Generation** | ✅ Built | CycloneDX v1.5 JSON software bill of materials export |
| | **License Compliance** | ✅ Built | Permissive vs Copyleft (GPL/AGPL) risk classification and dashboard |
| | **Dependency Intelligence** | ✅ Built | Advisory scanning with OSV API, in-memory caching & placeholder filters |
| | **Custom Security Policies** | ⏳ Roadmap | User-configurable security rule editor |
| **Phase 5: Production Readiness** | **Multi-User Isolation** | ✅ Built | Strict repository ownership enforcement with 404 security barriers |
| | **Performance Optimization** | ✅ Built | In-process MongoDB queue, non-blocking background workers |
| | **Automated Security Testing** | ✅ Built | 35 passing unit tests covering crypto, AST scanners, and CSRF |
| | **Deployment & Documentation** | ✅ Built | Complete guides for Vercel, Render, Railway, and Docker |

---

## 📄 License

MIT © [RepoLens](https://github.com/sayanthkv/repolens)
