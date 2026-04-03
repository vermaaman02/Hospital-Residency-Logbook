-- AlterTable
ALTER TABLE "InternalAssessment" ADD COLUMN     "assignedFacultyId" TEXT;

-- CreateIndex
CREATE INDEX "InternalAssessment_assignedFacultyId_idx" ON "InternalAssessment"("assignedFacultyId");

-- AddForeignKey
ALTER TABLE "InternalAssessment" ADD CONSTRAINT "InternalAssessment_assignedFacultyId_fkey" FOREIGN KEY ("assignedFacultyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
