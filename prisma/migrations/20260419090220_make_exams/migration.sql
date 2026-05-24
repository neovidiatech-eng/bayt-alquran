-- CreateTable
CREATE TABLE "exam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" DOUBLE PRECISION NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
