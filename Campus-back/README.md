# Campus Recruitment Backend

Backend API for the Campus Recruitment platform.

- Runtime: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT

## Prerequisites

1. Node.js 18+
2. PostgreSQL (local or remote)

## Environment Variables

Create `Campus-back/.env` from `.env.example`:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/campus_db?schema=public
PORT=3005
API_URL=http://localhost:3005
JWT_SECRET=replace_with_long_random_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
DISABLE_RATE_LIMIT=false
LOG_LEVEL=info

# Optional (file uploads)
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional (email notifications)
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
```

## Install And Run

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Server default: `http://localhost:3005`

Health check:

```bash
curl http://localhost:3005/health
```

## Scripts

```bash
npm run dev
npm run test
npm run lint
npm run format
npm run format:check
npm run start
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

## API Base

All endpoints are mounted under `/api`:

1. `/api/auth`
2. `/api/jobs`
3. `/api/applications`
4. `/api/admin`
5. `/api/upload`
6. `/api/student`

Static uploads are served at `/uploads`.

## Database

Prisma schema: `prisma/schema.prisma`

Core models:

1. `User`
2. `StudentProfile`
3. `CompanyProfile`
4. `Job`
5. `Application`

## Notes

1. `JWT_SECRET` is required. Server will fail fast if missing.
2. Keep `.env` out of git.
3. `uploads/` is ignored except `.gitkeep`.
4. CORS allowlist is configured in `src/server.js`.
5. Requests include `x-request-id` for traceability.
6. Security headers are enabled with `helmet`.

## Troubleshooting

1. `EADDRINUSE: 3005`  
   Another process is using port `3005`.

2. Prisma/db connection errors  
   Check `DATABASE_URL` and confirm PostgreSQL is running.

3. CORS blocked in browser  
   Check frontend URL and `FRONTEND_URL` / allowlist in `src/server.js`.
