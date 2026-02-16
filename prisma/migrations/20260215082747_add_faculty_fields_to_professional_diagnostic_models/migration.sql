-- AlterTable
ALTER TABLE "ConferenceParticipation" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "CourseAttended" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "DiagnosticSkill" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "DisasterDrill" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "QualityImprovement" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "ResearchActivity" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- CreateIndex
CREATE INDEX "ConferenceParticipation_facultyId_idx" ON "ConferenceParticipation"("facultyId");

-- CreateIndex
CREATE INDEX "CourseAttended_facultyId_idx" ON "CourseAttended"("facultyId");

-- CreateIndex
CREATE INDEX "DiagnosticSkill_facultyId_idx" ON "DiagnosticSkill"("facultyId");

-- CreateIndex
CREATE INDEX "DisasterDrill_facultyId_idx" ON "DisasterDrill"("facultyId");

-- CreateIndex
CREATE INDEX "QualityImprovement_facultyId_idx" ON "QualityImprovement"("facultyId");

-- CreateIndex
CREATE INDEX "ResearchActivity_facultyId_idx" ON "ResearchActivity"("facultyId");
