ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "applicationDeadline" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "isClosed" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "autoFinalizedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Job_isClosed_applicationDeadline_idx"
  ON "Job"("isClosed", "applicationDeadline");
