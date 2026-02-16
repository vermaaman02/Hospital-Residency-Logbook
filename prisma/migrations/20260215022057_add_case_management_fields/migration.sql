/*
  Warnings:

  - You are about to drop the column `patientInfo` on the `CaseManagementLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CaseManagementLog" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "uhid" TEXT;

-- CreateIndex
CREATE INDEX "CaseManagementLog_facultyId_idx" ON "CaseManagementLog"("facultyId");
