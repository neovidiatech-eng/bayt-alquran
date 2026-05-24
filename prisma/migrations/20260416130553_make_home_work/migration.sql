-- CreateTable
CREATE TABLE "homework" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homework_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homework_teacherId_idx" ON "homework"("teacherId");

-- CreateIndex
CREATE INDEX "homework_studentId_idx" ON "homework"("studentId");

-- CreateIndex
CREATE INDEX "homework_subjectId_idx" ON "homework"("subjectId");

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
