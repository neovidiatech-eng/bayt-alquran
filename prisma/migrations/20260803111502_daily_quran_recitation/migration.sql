-- CreateTable
CREATE TABLE "DailyQuranRecitation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startPage" INTEGER NOT NULL DEFAULT 1,
    "endPage" INTEGER NOT NULL DEFAULT 1,
    "surah" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyQuranRecitation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DailyQuranRecitation" ADD CONSTRAINT "DailyQuranRecitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuranRecitation" ADD CONSTRAINT "DailyQuranRecitation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
