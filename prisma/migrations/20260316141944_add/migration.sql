-- AlterTable
ALTER TABLE "student" ADD COLUMN     "sessions_attended" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessions_remaining" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "schedule" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_teacherId_idx" ON "schedule"("teacherId");

-- CreateIndex
CREATE INDEX "schedule_studentId_idx" ON "schedule"("studentId");

-- CreateIndex
CREATE INDEX "schedule_date_idx" ON "schedule"("date");

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
