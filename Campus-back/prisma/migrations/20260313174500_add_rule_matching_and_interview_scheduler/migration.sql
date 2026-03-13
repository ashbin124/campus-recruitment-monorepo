DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum enum
    JOIN pg_type type ON type.oid = enum.enumtypid
    WHERE type.typname = 'ApplicationStatus'
      AND enum.enumlabel = 'WAITLIST'
  ) THEN
    ALTER TYPE "ApplicationStatus" ADD VALUE 'WAITLIST';
  END IF;
END $$;

ALTER TABLE "StudentProfile"
ADD COLUMN IF NOT EXISTS "degree" TEXT,
ADD COLUMN IF NOT EXISTS "age" INTEGER,
ADD COLUMN IF NOT EXISTS "experienceYears" INTEGER;

ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "requiredDegree" TEXT,
ADD COLUMN IF NOT EXISTS "minAge" INTEGER,
ADD COLUMN IF NOT EXISTS "maxAge" INTEGER,
ADD COLUMN IF NOT EXISTS "minExperienceYears" INTEGER,
ADD COLUMN IF NOT EXISTS "interviewDates" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[],
ADD COLUMN IF NOT EXISTS "interviewStartTime" TEXT,
ADD COLUMN IF NOT EXISTS "interviewCandidatesPerDay" INTEGER;

ALTER TABLE "Application"
ADD COLUMN IF NOT EXISTS "matchScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "matchSummary" JSONB,
ADD COLUMN IF NOT EXISTS "interviewDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "interviewStartTime" TEXT,
ADD COLUMN IF NOT EXISTS "interviewQueueNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "waitlistRank" INTEGER,
ADD COLUMN IF NOT EXISTS "interviewNote" TEXT,
ADD COLUMN IF NOT EXISTS "manualInterviewOverride" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Application_jobId_status_matchScore_idx" ON "Application"("jobId", "status", "matchScore");
CREATE INDEX IF NOT EXISTS "Application_jobId_interviewDate_interviewQueueNumber_idx" ON "Application"("jobId", "interviewDate", "interviewQueueNumber");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
