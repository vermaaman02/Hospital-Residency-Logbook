/*
  Warnings:

  - You are about to drop the column `patientInfo` on the `Seminar` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Seminar" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "patientAge" TEXT,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "uhid" TEXT;

-- CreateIndex
CREATE INDEX "Seminar_facultyId_idx" ON "Seminar"("facultyId");
