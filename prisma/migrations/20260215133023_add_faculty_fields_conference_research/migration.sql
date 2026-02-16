-- AlterTable
ALTER TABLE "ConferenceParticipation" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "ResearchActivity" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- CreateIndex
CREATE INDEX "ConferenceParticipation_facultyId_idx" ON "ConferenceParticipation"("facultyId");

-- CreateIndex
CREATE INDEX "ResearchActivity_facultyId_idx" ON "ResearchActivity"("facultyId");
