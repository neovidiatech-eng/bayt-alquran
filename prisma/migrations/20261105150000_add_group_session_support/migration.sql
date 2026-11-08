-- AlterTable
ALTER TABLE "schedule" ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maxStudents" INTEGER DEFAULT 10,
ALTER COLUMN "studentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ScheduleStudent" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enrolled',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleStudent_scheduleId_idx" ON "ScheduleStudent"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduleStudent_studentId_idx" ON "ScheduleStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleStudent_scheduleId_studentId_key" ON "ScheduleStudent"("scheduleId", "studentId");

-- AddForeignKey
ALTER TABLE "ScheduleStudent" ADD CONSTRAINT "ScheduleStudent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleStudent" ADD CONSTRAINT "ScheduleStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

