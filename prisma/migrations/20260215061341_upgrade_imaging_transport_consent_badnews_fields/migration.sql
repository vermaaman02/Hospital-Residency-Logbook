/*
  Warnings:

  - You are about to drop the column `patientInfo` on the `BadNewsLog` table. All the data in the column will be lost.
  - You are about to drop the column `patientInfo` on the `ConsentLog` table. All the data in the column will be lost.
  - You are about to drop the column `patientInfo` on the `ImagingLog` table. All the data in the column will be lost.
  - You are about to drop the column `patientInfo` on the `TransportLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BadNewsLog" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "totalProcedureTally" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uhid" TEXT;

-- AlterTable
ALTER TABLE "ConsentLog" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "totalProcedureTally" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uhid" TEXT;

-- AlterTable
ALTER TABLE "ImagingLog" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "totalProcedureTally" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uhid" TEXT;

-- AlterTable
ALTER TABLE "TransportLog" DROP COLUMN "patientInfo",
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientSex" TEXT,
ADD COLUMN     "totalProcedureTally" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uhid" TEXT;

-- CreateIndex
CREATE INDEX "BadNewsLog_facultyId_idx" ON "BadNewsLog"("facultyId");

-- CreateIndex
CREATE INDEX "ConsentLog_facultyId_idx" ON "ConsentLog"("facultyId");

-- CreateIndex
CREATE INDEX "ImagingLog_facultyId_idx" ON "ImagingLog"("facultyId");

-- CreateIndex
CREATE INDEX "TransportLog_facultyId_idx" ON "TransportLog"("facultyId");
