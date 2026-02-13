-- CreateTable
CREATE TABLE "FacultyBatchAssignment" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultyBatchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacultyBatchAssignment_facultyId_idx" ON "FacultyBatchAssignment"("facultyId");

-- CreateIndex
CREATE INDEX "FacultyBatchAssignment_batchId_idx" ON "FacultyBatchAssignment"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyBatchAssignment_facultyId_batchId_key" ON "FacultyBatchAssignment"("facultyId", "batchId");

-- AddForeignKey
ALTER TABLE "FacultyBatchAssignment" ADD CONSTRAINT "FacultyBatchAssignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyBatchAssignment" ADD CONSTRAINT "FacultyBatchAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
