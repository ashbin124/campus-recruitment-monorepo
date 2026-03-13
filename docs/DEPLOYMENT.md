# Deployment Guide

This guide covers a safe staging-to-production rollout process for the Campus Recruitment platform.

## Environments

- `development`: local machine
- `staging`: production-like environment used for verification
- `production`: live user traffic

Use separate `.env` values and databases for each environment.

## Backend Deployment Checklist

1. Set required environment variables:
   - `DATABASE_URL`
   - `PORT`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `API_URL`
   - `FRONTEND_URL`
2. Install dependencies:

```bash
npm ci
```

3. Run migrations:

```bash
npx prisma migrate deploy
```

4. Run quality checks:

```bash
npm run lint
npm run format:check
npm test
```

5. Start service:

```bash
npm run start
```

## Frontend Deployment Checklist

1. Set environment variables:
   - `VITE_API_URL`
2. Install dependencies:

```bash
npm ci
```

3. Run quality checks and build:

```bash
npm run lint
npm run format:check
npm run build
```

4. Deploy generated `dist/` to hosting platform.

## Safe Release Sequence

1. Merge to staging branch.
2. Run CI and smoke-test critical flows:
   - login
   - student apply
   - company review/update status
   - admin stats
3. Promote the same tested commit to production.
4. Monitor logs and error rates for 30 minutes after release.

## Rollback

1. Roll back app deployment to the last known-good commit.
2. If a migration caused an issue, apply a prepared corrective migration (avoid ad-hoc manual SQL in production).
