-- AlterTable
ALTER TABLE "_AssessmentAssignedSpecificStudents" ADD CONSTRAINT "_AssessmentAssignedSpecificStudents_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_AssessmentAssignedSpecificStudents_AB_unique";
