-- Enums for normalized job type and application status
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'APPROVED');

-- Job type with sensible default
ALTER TABLE "Job"
ADD COLUMN "type" "JobType" NOT NULL DEFAULT 'FULL_TIME';

-- Convert existing string statuses into enum values
ALTER TABLE "Application"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Application"
ALTER COLUMN "status" TYPE "ApplicationStatus"
USING (
  CASE UPPER("status")
    WHEN 'PENDING' THEN 'PENDING'::"ApplicationStatus"
    WHEN 'INTERVIEW' THEN 'INTERVIEW'::"ApplicationStatus"
    WHEN 'ACCEPTED' THEN 'ACCEPTED'::"ApplicationStatus"
    WHEN 'REJECTED' THEN 'REJECTED'::"ApplicationStatus"
    WHEN 'APPROVED' THEN 'APPROVED'::"ApplicationStatus"
    ELSE 'PENDING'::"ApplicationStatus"
  END
);

ALTER TABLE "Application"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE INDEX "Job_companyId_createdAt_idx" ON "Job"("companyId", "createdAt");
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");
