-- Add public-facing company profile fields
ALTER TABLE "CompanyProfile"
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "about" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
