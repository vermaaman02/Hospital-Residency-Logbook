/*
  Warnings:

  - Added the required column `updatedAt` to the `ThesisSemesterRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ThesisSemesterRecord" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "facultyRemark" TEXT,
ADD COLUMN     "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "ThesisSemesterRecord_status_idx" ON "ThesisSemesterRecord"("status");
