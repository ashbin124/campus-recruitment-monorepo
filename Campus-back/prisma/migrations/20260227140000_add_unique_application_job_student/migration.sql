-- Remove duplicate applications for the same (jobId, studentId), keeping the earliest row.
DELETE FROM "Application" a
USING "Application" b
WHERE a.id > b.id
  AND a."jobId" = b."jobId"
  AND a."studentId" = b."studentId";

-- Enforce one application per student per job.
ALTER TABLE "Application"
ADD CONSTRAINT "Application_jobId_studentId_key" UNIQUE ("jobId", "studentId");
