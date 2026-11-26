# 📊 RepoLens Scanner Benchmarks

**Date Recorded:** 2026-11-26  
**Scanner Version:** RepoLens `main` (`8b78703e6fab0afe53a8307c4b8fb10126c7c828`)  
**Scope:** Static secret scan (`secretsScanner.ts`), code pattern scan (`patternScanner.ts`), and live OSV.dev dependency batch lookup (`dependencyScanner.ts`) using the same file-filtering rules (`shouldSkipRepoPath`) as `MongoScanQueue`.

> **Results are from a small fixture set and are not a claim of general accuracy.**

---

## 1. Measured Results

| Target Repository | Commit Hash | Files Scanned | Total Duration (Static + OSV.dev) | Total Findings | Breakdown (Crit / High / Med / Low) | Manual Review Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **OWASP NodeGoat** | `c5cb68a7084e4ae7dcc60e6a98768720a81841e8` | 92 | 0.873s (`0.036s` static) | 23 | `1 / 21 / 1 / 0` | 22 true positives, **1 false positive** (`app/routes/contributions.js:31` comment mentioning `eval()`) |
| **Appsecco DVNA** | `9ba473add536f66ac9007966acb2a775dd31277a` | 124 | 0.733s (`0.026s` static) | 29 | `0 / 28 / 1 / 0` | 27 true positives, **2 false positives** (`core/appHandler.js:152` & `core/authHandler.js:71` confirm-password checks `password == cpassword`) |
| **RepoLens (Monorepo)** | `8b78703e6fab0afe53a8307c4b8fb10126c7c828` | 115 (114 non-lock) | 0.563s (`0.053s` static) | 33 | `15 / 17 / 1 / 0` | 7 OSV dev/build advisories (`vite`, `zod`, `vitest`), 1 sanitized Mermaid SVG render (`mermaid-diagram.tsx:82`), plus self-matches on test fixtures, rule strings, and local `.env` |

---

## 2. Manual Finding Review Details

### OWASP NodeGoat (`c5cb68a7084e4ae7dcc60e6a98768720a81841e8`)
- **True Positives (22 / 23):**
  - `app/routes/contributions.js:32, 33, 34` — 3 real `eval(req.body.*)` calls (`PAT-EVAL`).
  - `artifacts/cert/server.key:1` — committed private key (`SEC-PRIVATE-KEY`).
  - `config/env/development.js:6` & `config/env/test.js:6` — hardcoded `zapApiKey` (`SEC-HIGH-ENTROPY`).
  - `server.js:15` — Express app initialized without `helmet()` (`PAT-MISSING-HELMET`).
  - `package.json` — 15 real OSV.dev advisories across `body-parser@1.15.1`, `express@4.13.4`, `marked@0.3.5`, `mongodb@2.1.18`, `swig@1.4.2`, `underscore@1.8.3`, `grunt@1.0.3`.
- **False Positives (1 / 23):**
  - `app/routes/contributions.js:31` — `// Insecure use of eval() to parse inputs` is a comment, flagged because `patternScanner.ts` uses line-based RegExp instead of an AST parser.

### Appsecco DVNA (`9ba473add536f66ac9007966acb2a775dd31277a`)
- **True Positives (27 / 29):**
  - `core/appHandler.js:197` — `mathjs.eval(req.body.eqn)` (`PAT-EVAL`).
  - `server.js:11` — Express app initialized without `helmet()` (`PAT-MISSING-HELMET`).
  - `package.json` — 25 real OSV.dev advisories across `bcrypt@1.0.3`, `ejs@2.5.7`, `express@4.16.2`, `express-fileupload@0.4.0`, `libxmljs@0.19.1`, `mathjs@3.10.1`, `morgan@1.9.0`, `mysql2@1.4.2`, `node-serialize@0.0.4`, `passport@0.4.0`, `sequelize@4.13.10`.
- **False Positives (2 / 29):**
  - `core/appHandler.js:152` & `core/authHandler.js:71` — `if (req.body.password == req.body.cpassword)` is a registration/reset confirm-password comparison, not a stored plaintext password check.

---

## 3. Steps to Reproduce

1. Clone the target repositories fresh:
   ```bash
   git clone --depth 1 https://github.com/OWASP/NodeGoat.git /tmp/bench/NodeGoat
   git clone --depth 1 https://github.com/appsecco/dvna.git /tmp/bench/dvna
   ```
2. Check out the exact commits above (`c5cb68a` for NodeGoat, `9ba473a` for DVNA).
3. Collect all non-ignored files using `shouldSkipRepoPath(relPath, size)` from `server/src/services/github/repoFiles.ts` (skipping `node_modules`, `dist`, `.git`, binary files, and files `> 500 KB`).
4. Run `scanFileForSecrets(path, content)`, `scanFileForPatterns(path, content)` on non-lockfiles, and `await scanDependenciesWithOSV(files)` across all collected files (matching `server/src/queue/scanQueue.ts`).
5. Inspect each reported finding line-by-line against the target file to classify true positives vs. false positives.
