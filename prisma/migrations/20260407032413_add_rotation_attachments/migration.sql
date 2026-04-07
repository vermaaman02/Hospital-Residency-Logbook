-- Add attachments column to RotationPosting
ALTER TABLE "RotationPosting" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
