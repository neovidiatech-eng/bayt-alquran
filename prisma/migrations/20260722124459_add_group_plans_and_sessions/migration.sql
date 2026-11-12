-- AlterTable
ALTER TABLE "Plans"
  ADD COLUMN IF NOT EXISTS "isGroup" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxStudents" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "planType" TEXT NOT NULL DEFAULT 'individual';

-- AlterTable
ALTER TABLE "schedule"
  ADD COLUMN IF NOT EXISTS "isGroup" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxStudents" INTEGER NOT NULL DEFAULT 1,
  ALTER COLUMN "studentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "teacher"
  ADD COLUMN IF NOT EXISTS "group_hour_price" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GroupScheduleStudent" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupScheduleStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupScheduleStudent_scheduleId_idx" ON "GroupScheduleStudent"("scheduleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupScheduleStudent_studentId_idx" ON "GroupScheduleStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GroupScheduleStudent_scheduleId_studentId_key" ON "GroupScheduleStudent"("scheduleId", "studentId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GroupScheduleStudent" ADD CONSTRAINT "GroupScheduleStudent_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GroupScheduleStudent" ADD CONSTRAINT "GroupScheduleStudent_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;