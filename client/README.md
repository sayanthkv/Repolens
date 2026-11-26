# 💻 @repolens/client

The frontend user interface for **RepoLens**, built as a fast, ergonomic React 18 Single-Page Application (SPA).

## 🚀 Tech Stack
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS (Locked permanently to Dark Mode)
- **Icons**: Lucide React
- **Data Visualization**: Recharts (Security score trend lines & severity breakdown donut charts)
- **Architecture Diagrams**: Mermaid.js & Cytoscape
- **Real-Time Updates**: Socket.io Client

## 📂 Key Directory Structure
```
src/
├── components/          # Reusable UI primitives (AppShell, ScoreRing, MermaidDiagram, AskRepoPanel)
├── pages/               # Application routes (HomePage, DashboardPage, RepoDetailPage, ConnectRepoPage)
├── lib/                 # Utilities, API fetch client, Auth provider, and client-side routing shims
└── styles/              # Global Tailwind CSS definitions
```

## 🛠️ Development
```bash
# Run standalone dev server on :3000
npm run dev

# Build for production
npm run build
```
