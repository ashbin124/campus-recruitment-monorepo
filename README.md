# Campus Recruitment Monorepo

This workspace contains the full Campus Recruitment platform:

- `Campusrec.io` (frontend): React + Vite + Tailwind
- `Campus-back` (backend): Node.js + Express + Prisma + PostgreSQL

## Quick Start

1. Install dependencies:

```bash
cd Campus-back && npm install
cd ../Campusrec.io && npm install
cd ..
```

2. Configure environment files:

- `Campus-back/.env` from `Campus-back/.env.example`
- `Campusrec.io/.env` from `Campusrec.io/.env.example`

3. Start everything:

```bash
npm run start:all
```

## Service URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3005`
- Backend health: `http://localhost:3005/health`

## Quality Checks

Backend:

```bash
cd Campus-back
npm run lint
npm run format:check
npm test
```

Frontend:

```bash
cd Campusrec.io
npm run lint
npm run format:check
npm run build
```

## CI and Automation

Automation is configured at the monorepo root:

- CI workflow: `.github/workflows/ci.yml`
  - Runs backend checks (`lint`, `format:check`, `test`)
  - Runs frontend checks (`lint`, `format:check`, `build`)
  - Triggers on push, pull request, and manual dispatch
- Dependency automation: `.github/dependabot.yml`
  - Weekly npm updates for `Campus-back` and `Campusrec.io`
  - Weekly GitHub Actions updates

## Deployment and Operations

See:

- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`
- `docs/FULL_PROJECT_DOCUMENTATION.md` (interview-ready full project document)
