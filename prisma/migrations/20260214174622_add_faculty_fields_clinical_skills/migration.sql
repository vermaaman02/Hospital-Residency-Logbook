-- AlterTable
ALTER TABLE "ClinicalSkillAdult" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "ClinicalSkillPediatric" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "JournalClub" ADD COLUMN     "facultyId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationsLastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ClinicalSkillAdult_facultyId_idx" ON "ClinicalSkillAdult"("facultyId");

-- CreateIndex
CREATE INDEX "ClinicalSkillPediatric_facultyId_idx" ON "ClinicalSkillPediatric"("facultyId");

-- CreateIndex
CREATE INDEX "JournalClub_facultyId_idx" ON "JournalClub"("facultyId");
