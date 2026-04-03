-- AlterTable: add attachments column to InternalAssessment
ALTER TABLE "InternalAssessment" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: add attachments column to AssessmentSubmission
ALTER TABLE "AssessmentSubmission" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable: implicit many-to-many junction for InternalAssessment <-> User (specificAssessments)
CREATE TABLE "_AssessmentAssignedSpecificStudents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex: unique constraint on junction table
CREATE UNIQUE INDEX "_AssessmentAssignedSpecificStudents_AB_unique" ON "_AssessmentAssignedSpecificStudents"("A", "B");

-- CreateIndex: index on B column for reverse lookups
CREATE INDEX "_AssessmentAssignedSpecificStudents_B_index" ON "_AssessmentAssignedSpecificStudents"("B");

-- AddForeignKey: A references InternalAssessment
ALTER TABLE "_AssessmentAssignedSpecificStudents" ADD CONSTRAINT "_AssessmentAssignedSpecificStudents_A_fkey" FOREIGN KEY ("A") REFERENCES "InternalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: B references User
ALTER TABLE "_AssessmentAssignedSpecificStudents" ADD CONSTRAINT "_AssessmentAssignedSpecificStudents_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
