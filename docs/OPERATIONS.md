# Operations Runbook

## Monitoring Baseline

Backend logs are emitted in structured JSON and include:

- timestamp
- level
- request ID (`x-request-id`)
- method, path, status code, duration

Use these logs to trace incidents and API failures quickly.

## Health Checks

- Backend readiness endpoint: `GET /health`

Expected response:

```json
{ "status": "ok" }
```

## Incident Triage

1. Confirm backend health endpoint.
2. Verify DB connectivity from backend logs.
3. Check latest deployment and env changes.
4. Inspect frontend console/network for failed API calls.
5. Use `x-request-id` from failed requests to correlate backend logs.

## Security Hygiene

Do these regularly:

1. Rotate `JWT_SECRET`.
2. Keep dependencies updated (`npm outdated`, `npm update` with review).
3. Review CORS allowlist when domains change.
4. Ensure `.env` files are never committed.

## Maintenance Commands

Backend:

```bash
npm run lint
npm run format:check
npm test
```

Frontend:

```bash
npm run lint
npm run format:check
npm run build
```
