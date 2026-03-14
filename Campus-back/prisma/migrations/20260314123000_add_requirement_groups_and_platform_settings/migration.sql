ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "requirementGroups" JSONB,
ADD COLUMN IF NOT EXISTS "flexibleMatchThreshold" INTEGER;

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" TEXT NOT NULL,
  "valueInt" INTEGER,
  "valueJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "PlatformSetting" ("key", "valueInt", "createdAt", "updatedAt")
VALUES (
  'GLOBAL_FLEXIBLE_THRESHOLD_PERCENT',
  40,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
