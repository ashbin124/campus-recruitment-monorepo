# Campus Recruitment Platform

Frontend application for the Campus Recruitment project.

- Frontend: React + Vite + TailwindCSS
- Backend (separate folder): Node.js + Express + Prisma
- Database: PostgreSQL

This frontend is in `Campusrec.io/` and connects to backend API in `../Campus-back/`.

## Prerequisites

1. Node.js 18+ and npm
2. PostgreSQL running locally or remotely
3. Backend and frontend dependencies installed

## Environment Variables

Create `Campusrec.io/.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:3005/api
```

Create `Campus-back/.env` from `.env.example`:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/campus_db?schema=public
PORT=3005
API_URL=http://localhost:3005
JWT_SECRET=replace_with_long_random_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

# Optional (only if using Cloudinary uploads)
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional (only if sending emails)
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
```

## Run Locally

Start in this order.

1. Start PostgreSQL

```bash
brew services start postgresql@16
```

2. Start backend

```bash
cd ../Campus-back
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

3. Start frontend (new terminal)

```bash
cd Campusrec.io
npm install
npm run dev
```

4. Open app

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3005/health`

## Frontend Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run format:check
```

## Backend Scripts (from `Campus-back/`)

```bash
npm run dev
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

## API Base URL

All frontend requests use:

- `VITE_API_URL` (from `.env`)
- Fallback: `http://localhost:3005/api`

## Core Features

1. JWT authentication with role-based access (`STUDENT`, `COMPANY`, `ADMIN`)
2. Job posting and listing
3. Student job applications with resume upload
4. Company application review and status updates
5. Admin dashboard stats and company account creation

## Troubleshooting

1. `EADDRINUSE: 3005`  
   Another backend process is already running on port `3005`.

2. CORS error in browser  
   Check `VITE_API_URL`, `FRONTEND_URL`, and backend CORS allowlist in `Campus-back/src/server.js`.

3. Prisma/database errors  
   Verify `DATABASE_URL`, ensure PostgreSQL is running, then run:

```bash
cd ../Campus-back
npx prisma generate
npx prisma migrate deploy
```

4. Login fails after backend/env changes  
   Clear `localStorage` token in browser and log in again.

## Notes

1. Do not commit `.env` files.
2. Keep uploaded files out of git (backend `uploads/` is ignored except `.gitkeep`).
