/*
  Warnings:

  - You are about to drop the column `patientInfo` on the `CasePresentation` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PatientCategory" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "CasePresentation" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "patientAge" TEXT,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "uhid" TEXT;

-- CreateIndex
CREATE INDEX "CasePresentation_facultyId_idx" ON "CasePresentation"("facultyId");
