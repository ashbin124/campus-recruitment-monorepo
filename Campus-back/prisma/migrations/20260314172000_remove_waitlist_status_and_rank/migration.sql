DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum enum
    JOIN pg_type type ON type.oid = enum.enumtypid
    WHERE type.typname = 'ApplicationStatus'
      AND enum.enumlabel = 'WAITLIST'
  ) THEN
    UPDATE "Application"
    SET "status" = 'REJECTED'::"ApplicationStatus"
    WHERE "status" = 'WAITLIST'::"ApplicationStatus";

    IF EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typname = 'ApplicationStatus_new'
    ) THEN
      DROP TYPE "ApplicationStatus_new";
    END IF;

    CREATE TYPE "ApplicationStatus_new" AS ENUM (
      'PENDING',
      'INTERVIEW',
      'ACCEPTED',
      'REJECTED',
      'APPROVED'
    );

    ALTER TABLE "Application"
    ALTER COLUMN "status" DROP DEFAULT;

    ALTER TABLE "Application"
    ALTER COLUMN "status" TYPE "ApplicationStatus_new"
    USING ("status"::text::"ApplicationStatus_new");

    DROP TYPE "ApplicationStatus";
    ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";

    ALTER TABLE "Application"
    ALTER COLUMN "status" SET DEFAULT 'PENDING'::"ApplicationStatus";
  END IF;
END $$;

ALTER TABLE "Application"
DROP COLUMN IF EXISTS "waitlistRank";
