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

## CI

Each repo has its own CI workflow:

- `Campus-back/.github/workflows/ci.yml`
- `Campusrec.io/.github/workflows/ci.yml`

## Deployment and Operations

See:

- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`
