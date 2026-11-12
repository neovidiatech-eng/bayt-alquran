-- AlterTable
ALTER TABLE "Plans" ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxStudents" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "planType" TEXT NOT NULL DEFAULT 'individual';

-- AlterTable
ALTER TABLE "schedule" ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxStudents" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "studentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "teacher" ADD COLUMN     "group_hour_price" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "GroupScheduleStudent" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupScheduleStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupScheduleStudent_scheduleId_idx" ON "GroupScheduleStudent"("scheduleId");

-- CreateIndex
CREATE INDEX "GroupScheduleStudent_studentId_idx" ON "GroupScheduleStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupScheduleStudent_scheduleId_studentId_key" ON "GroupScheduleStudent"("scheduleId", "studentId");

-- AddForeignKey
ALTER TABLE "GroupScheduleStudent" ADD CONSTRAINT "GroupScheduleStudent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupScheduleStudent" ADD CONSTRAINT "GroupScheduleStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
