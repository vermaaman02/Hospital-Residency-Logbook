-- CreateTable
CREATE TABLE "RotationPostingConfiguration" (
    "id" TEXT NOT NULL,
    "rotationSlNo" INTEGER NOT NULL,
    "batchId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPostingConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RotationPostingConfiguration_batchId_idx" ON "RotationPostingConfiguration"("batchId");

-- CreateIndex
CREATE INDEX "RotationPostingConfiguration_departmentId_idx" ON "RotationPostingConfiguration"("departmentId");

-- CreateIndex
CREATE INDEX "RotationPostingConfiguration_semester_idx" ON "RotationPostingConfiguration"("semester");

-- CreateIndex
CREATE INDEX "RotationPostingConfiguration_isEnabled_idx" ON "RotationPostingConfiguration"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "RotationPostingConfiguration_rotationSlNo_batchId_semester__key" ON "RotationPostingConfiguration"("rotationSlNo", "batchId", "semester", "departmentId");

-- AddForeignKey
ALTER TABLE "RotationPostingConfiguration" ADD CONSTRAINT "RotationPostingConfiguration_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationPostingConfiguration" ADD CONSTRAINT "RotationPostingConfiguration_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
