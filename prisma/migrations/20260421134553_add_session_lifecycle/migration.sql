-- AlterTable
ALTER TABLE "student" ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "teacher" ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ScheduleLog" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "joinTime_student" TIMESTAMP(3),
    "leaveTime_student" TIMESTAMP(3),
    "joinTime_teacher" TIMESTAMP(3),
    "leaveTime_teacher" TIMESTAMP(3),
    "duration_student" DOUBLE PRECISION,
    "duration_teacher" DOUBLE PRECISION,
    "isTeacherLate" BOOLEAN NOT NULL DEFAULT false,
    "isTeacherCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isStudentAttended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "role" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleLog_scheduleId_key" ON "ScheduleLog"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_scheduleId_reviewerId_key" ON "Review"("scheduleId", "reviewerId");

-- AddForeignKey
ALTER TABLE "ScheduleLog" ADD CONSTRAINT "ScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
