# 🔒 Security Policy & Architectural Decisions

## 1. Supported Versions

| Version | Supported |
| :--- | :---: |
| `0.1.x` (Current `main`) | ✅ Yes |
| Older snapshots | ❌ No |

---

## 2. Reporting a Vulnerability

Security is paramount to RepoLens. If you discover a vulnerability or security weakness, please report it responsibly:

- **Channel**: Use **GitHub's Private Vulnerability Reporting** on this repository (Security tab $\rightarrow$ Advisories $\rightarrow$ Report a vulnerability).
- **Response Target**: Best-effort, typically within a week.
- **Scope**: Please do not perform denial-of-service attacks or access unauthorized user data during testing.

---

## 3. Security Design Decisions

RepoLens adheres to a defense-in-depth security model across authentication, storage, scanning, and AI remediation:

### A. Minimal GitHub OAuth Scopes
RepoLens adheres to the Principle of Least Privilege by requesting only three minimal scopes:
- `read:user`: To display the user's username and GitHub avatar.
- `user:email`: To identify the user profile.
- `public_repo`: To fetch public repository trees for scanning, configure webhooks, and open automated Pull Requests for safe code fixes.
> **Note**: RepoLens intentionally **does not request the broad `repo` scope**, avoiding access to private repository admin hooks, organization secrets, or repository deletion capabilities.

### B. Constant-Time Webhook Verification
Every incoming GitHub webhook (`/api/webhooks/github`) is cryptographically verified against the repository's encrypted webhook secret:
- Computes an HMAC-SHA256 signature over the raw request body.
- Uses Node.js's native `crypto.timingSafeEqual()` to prevent timing attacks when comparing `X-Hub-Signature-256`.
- Payloads missing valid signatures are rejected immediately with HTTP `401`.

### C. AES-256-GCM Token Encryption at Rest
User GitHub access tokens and repository webhook secrets are encrypted before persisting to MongoDB:
- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode).
- **IV Generation**: Unique, cryptographically random 12-byte IV per record (`crypto.randomBytes(12)`).
- **Integrity Tag**: 16-byte authentication tag verified on every decryption. Any tampering in the database immediately triggers a MAC authentication error.

### D. Multi-Tenant Isolation & IDOR Protection
- All repository, scan, finding, SBOM, license, and AI queries are strictly scoped to the authenticated user's ID (`req.user.id`).
- Accessing or mutating a resource owned by another user returns HTTP `404` to prevent resource enumeration.

### E. Server Hardening, Session & CSRF Defense
- **HTTP Security Headers**: Express server is hardened using `helmet()`, enforcing protections against clickjacking (`X-Frame-Options`), MIME-sniffing, and cross-site scripting.
- **Strict CORS Allowlist**: Cross-Origin Resource Sharing is restricted strictly to the configured `CLIENT_URL` with credentials enabled.
- **Signed HttpOnly Session Cookies**: Authentication tokens are never exposed to `localStorage` or client-side JavaScript.
- **Double-Submit CSRF Cookies**: All state-changing endpoints (`POST`, `PATCH`, `DELETE`) require an `X-CSRF-Token` header matching a cryptographically signed cookie.
- **Payload Size Limits**: JSON body parsing is capped at `1MB` to mitigate memory exhaustion.

### F. Rate Limiting on Paid / AI Endpoints
To prevent denial-of-wallet and API quota exhaustion:
- `/api/repos/:id/scans`: Capped at **10 requests / minute**.
- `/api/repos/:id/summary`: Capped at **5 requests / minute**.
- `/api/repos/:id/ask`: Capped at **15 requests / minute**.
- `/api/findings/:id/create-pr`: Capped at **10 requests / minute**.

### G. Untrusted Code, Secret Masking & LLM Prompt Injection Defense
- **Zero Host Execution**: RepoLens never runs `npm install`, `eval`, or shell commands on user repositories. Code files are read into memory buffers and statically evaluated via regex, Shannon entropy, and context-aware code pattern rules (`patternScanner.ts`).
- **Pre-Storage Secret Masking**: Detected high-entropy credentials and tokens are masked (`ghp_12****cdef`) before database persistence and before any snippet is sent to an external LLM.
- **Prompt Injection Isolation**: Repository content passed to the LLM is fenced inside strict system prompts instructing the model to treat file contents strictly as passive analysis data.
- **Human-in-the-Loop Remediation**: The 1-click Auto-Remediation engine validates that patches touch only the targeted file and **never auto-merges**—a human developer must inspect and merge the Pull Request on GitHub.
