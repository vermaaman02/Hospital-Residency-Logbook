/*
  Warnings:

  - You are about to drop the column `score` on the `TrainingMentoringRecord` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,semester]` on the table `TrainingMentoringRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RotationPosting" ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "facultyId" TEXT;

-- AlterTable
ALTER TABLE "TrainingMentoringRecord" DROP COLUMN "score",
ADD COLUMN     "clinicalSkillScore" INTEGER,
ADD COLUMN     "evaluatedById" TEXT,
ADD COLUMN     "knowledgeScore" INTEGER,
ADD COLUMN     "overallScore" DOUBLE PRECISION,
ADD COLUMN     "proceduralSkillScore" INTEGER,
ADD COLUMN     "researchScore" INTEGER,
ADD COLUMN     "softSkillScore" INTEGER;

-- CreateIndex
CREATE INDEX "RotationPosting_facultyId_idx" ON "RotationPosting"("facultyId");

-- CreateIndex
CREATE INDEX "TrainingMentoringRecord_evaluatedById_idx" ON "TrainingMentoringRecord"("evaluatedById");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingMentoringRecord_userId_semester_key" ON "TrainingMentoringRecord"("userId", "semester");
