-- CreateTable
CREATE TABLE "RotationPostingStudentConfiguration" (
    "id" TEXT NOT NULL,
    "rotationSlNo" INTEGER NOT NULL,
    "batchId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "departmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPostingStudentConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RotationPostingStudentConfiguration_batchId_idx" ON "RotationPostingStudentConfiguration"("batchId");

-- CreateIndex
CREATE INDEX "RotationPostingStudentConfiguration_departmentId_idx" ON "RotationPostingStudentConfiguration"("departmentId");

-- CreateIndex
CREATE INDEX "RotationPostingStudentConfiguration_semester_idx" ON "RotationPostingStudentConfiguration"("semester");

-- CreateIndex
CREATE INDEX "RotationPostingStudentConfiguration_studentId_idx" ON "RotationPostingStudentConfiguration"("studentId");

-- CreateIndex
CREATE INDEX "RotationPostingStudentConfiguration_isEnabled_idx" ON "RotationPostingStudentConfiguration"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "RotationPostingStudentConfiguration_rotationSlNo_batchId_semes_key" ON "RotationPostingStudentConfiguration"("rotationSlNo", "batchId", "semester", "departmentId", "studentId");

-- AddForeignKey
ALTER TABLE "RotationPostingStudentConfiguration" ADD CONSTRAINT "RotationPostingStudentConfiguration_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationPostingStudentConfiguration" ADD CONSTRAINT "RotationPostingStudentConfiguration_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationPostingStudentConfiguration" ADD CONSTRAINT "RotationPostingStudentConfiguration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
