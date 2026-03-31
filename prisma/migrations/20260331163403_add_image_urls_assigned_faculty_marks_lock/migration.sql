-- AlterTable
ALTER TABLE "AssessmentEvaluation" ADD COLUMN     "isMarksLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DiagnosticSkill" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ImagingLog" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ResidentEvaluation" ADD COLUMN     "assignedFacultyId" TEXT;

-- CreateIndex
CREATE INDEX "ResidentEvaluation_assignedFacultyId_idx" ON "ResidentEvaluation"("assignedFacultyId");
