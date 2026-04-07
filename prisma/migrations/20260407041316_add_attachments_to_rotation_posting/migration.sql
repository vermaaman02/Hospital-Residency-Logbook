-- AlterTable
ALTER TABLE "RotationPosting" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
