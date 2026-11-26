# ⚙️ @repolens/server

The backend API and security scanning engine for **RepoLens**, written in strict TypeScript on Node.js and Express.

## 🚀 Tech Stack
- **Runtime**: Node.js & Express
- **Language**: TypeScript
- **Database**: MongoDB & Mongoose
- **Real-Time Communication**: Socket.io
- **Queue Engine**: In-process `MongoScanQueue` (Zero external Redis dependency)
- **Testing**: Vitest & Supertest (35 passing unit tests)
- **AI Integration**: Anthropic Claude, Google Gemini, OpenAI

## 📂 Key Directory Structure
```
src/
├── config/              # Environment variables (Zod validated) and MongoDB connection
├── controllers/         # REST API route handlers (Auth, Repos, Scans, Summary, Ask, Webhooks)
├── middleware/          # Session validation, Double-Submit CSRF check, and Error handler
├── models/              # Mongoose schemas (User, Repo, Scan, Finding, Chunk, Summary)
├── queue/               # In-process MongoScanQueue background scanner
├── routes/              # Express route declarations
├── services/            # Core business logic:
│   ├── github/          # GitHub API client, Tree fetcher, and 1-click PR creator
│   ├── scanners/        # Secrets scanner, AST pattern analyzer, OSV dependency scanner, License & SBOM
│   ├── llm/             # Finding explainer and AI remediation generator
│   └── rag/             # Semantic code chunker and repository Q&A engine
└── utils/               # AES-256-GCM crypto, Shannon entropy, and masking utilities
```

## 🛠️ Development & Testing
```bash
# Run dev server on :4000
npm run dev

# Run unit tests
npm run test

# Build TypeScript to dist/
npm run build
```
