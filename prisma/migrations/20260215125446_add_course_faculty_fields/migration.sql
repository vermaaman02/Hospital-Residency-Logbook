/*
  Warnings:

  - You are about to drop the column `facultyId` on the `ConferenceParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `facultyRemark` on the `ConferenceParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `facultyId` on the `DiagnosticSkill` table. All the data in the column will be lost.
  - You are about to drop the column `facultyRemark` on the `DiagnosticSkill` table. All the data in the column will be lost.
  - You are about to drop the column `facultyId` on the `DisasterDrill` table. All the data in the column will be lost.
  - You are about to drop the column `facultyRemark` on the `DisasterDrill` table. All the data in the column will be lost.
  - You are about to drop the column `facultyId` on the `QualityImprovement` table. All the data in the column will be lost.
  - You are about to drop the column `facultyRemark` on the `QualityImprovement` table. All the data in the column will be lost.
  - You are about to drop the column `facultyId` on the `ResearchActivity` table. All the data in the column will be lost.
  - You are about to drop the column `facultyRemark` on the `ResearchActivity` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ConferenceParticipation_facultyId_idx";

-- DropIndex
DROP INDEX "DiagnosticSkill_facultyId_idx";

-- DropIndex
DROP INDEX "DisasterDrill_facultyId_idx";

-- DropIndex
DROP INDEX "QualityImprovement_facultyId_idx";

-- DropIndex
DROP INDEX "ResearchActivity_facultyId_idx";

-- AlterTable
ALTER TABLE "ConferenceParticipation" DROP COLUMN "facultyId",
DROP COLUMN "facultyRemark";

-- AlterTable
ALTER TABLE "DiagnosticSkill" DROP COLUMN "facultyId",
DROP COLUMN "facultyRemark";

-- AlterTable
ALTER TABLE "DisasterDrill" DROP COLUMN "facultyId",
DROP COLUMN "facultyRemark";

-- AlterTable
ALTER TABLE "QualityImprovement" DROP COLUMN "facultyId",
DROP COLUMN "facultyRemark";

-- AlterTable
ALTER TABLE "ResearchActivity" DROP COLUMN "facultyId",
DROP COLUMN "facultyRemark";
