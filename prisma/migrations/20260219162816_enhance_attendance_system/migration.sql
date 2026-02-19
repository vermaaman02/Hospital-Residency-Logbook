-- AlterTable
ALTER TABLE "AttendanceEntry" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "markedAt" TIMESTAMP(3),
ADD COLUMN     "withinLocation" BOOLEAN;

-- CreateTable
CREATE TABLE "AttendanceConfig" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchStartDate" TIMESTAMP(3) NOT NULL,
    "batchEndDate" TIMESTAMP(3) NOT NULL,
    "classStartTime" TEXT NOT NULL,
    "classEndTime" TEXT NOT NULL,
    "locationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "locationLatitude" DOUBLE PRECISION,
    "locationLongitude" DOUBLE PRECISION,
    "locationRadiusMeters" INTEGER DEFAULT 500,
    "weeklyOffDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimumAttendancePct" DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceHoliday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceConfig_batchId_idx" ON "AttendanceConfig"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceConfig_batchId_key" ON "AttendanceConfig"("batchId");

-- CreateIndex
CREATE INDEX "AttendanceHoliday_batchId_idx" ON "AttendanceHoliday"("batchId");

-- CreateIndex
CREATE INDEX "AttendanceHoliday_date_idx" ON "AttendanceHoliday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceHoliday_date_batchId_key" ON "AttendanceHoliday"("date", "batchId");

-- CreateIndex
CREATE INDEX "AttendanceEntry_date_idx" ON "AttendanceEntry"("date");

-- CreateIndex
CREATE INDEX "AttendanceSheet_weekStartDate_idx" ON "AttendanceSheet"("weekStartDate");

-- AddForeignKey
ALTER TABLE "AttendanceConfig" ADD CONSTRAINT "AttendanceConfig_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceHoliday" ADD CONSTRAINT "AttendanceHoliday_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
