-- AlterTable
ALTER TABLE "DisasterDrill" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- AlterTable
ALTER TABLE "QualityImprovement" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "facultyRemark" TEXT;

-- CreateTable
CREATE TABLE "LogbookFacultyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "reviewNo" TEXT,
    "date" TIMESTAMP(3),
    "description" TEXT,
    "roleInActivity" TEXT,
    "facultyId" TEXT,
    "facultyRemark" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogbookFacultyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogbookFacultyReview_userId_idx" ON "LogbookFacultyReview"("userId");

-- CreateIndex
CREATE INDEX "LogbookFacultyReview_status_idx" ON "LogbookFacultyReview"("status");

-- CreateIndex
CREATE INDEX "LogbookFacultyReview_facultyId_idx" ON "LogbookFacultyReview"("facultyId");

-- CreateIndex
CREATE INDEX "DisasterDrill_facultyId_idx" ON "DisasterDrill"("facultyId");

-- CreateIndex
CREATE INDEX "QualityImprovement_facultyId_idx" ON "QualityImprovement"("facultyId");

-- AddForeignKey
ALTER TABLE "LogbookFacultyReview" ADD CONSTRAINT "LogbookFacultyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
