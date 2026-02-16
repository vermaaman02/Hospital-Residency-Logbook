/*
  Warnings:

  - You are about to drop the column `patientInfo` on the `ProcedureLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProcedureLog" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "totalProcedureTally" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uhid" TEXT;

-- CreateIndex
CREATE INDEX "ProcedureLog_facultyId_idx" ON "ProcedureLog"("facultyId");
