/*
  Warnings:

  - You are about to drop the column `hour_price` on the `teacher` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "teacher" DROP COLUMN "hour_price";

-- CreateTable
CREATE TABLE "student_teacher" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "hour_price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TeacherStudentRelation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeacherStudentRelation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "student_teacher_studentId_idx" ON "student_teacher"("studentId");

-- CreateIndex
CREATE INDEX "student_teacher_teacherId_idx" ON "student_teacher"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "student_teacher_studentId_teacherId_key" ON "student_teacher"("studentId", "teacherId");

-- CreateIndex
CREATE INDEX "_TeacherStudentRelation_B_index" ON "_TeacherStudentRelation"("B");

-- AddForeignKey
ALTER TABLE "student_teacher" ADD CONSTRAINT "student_teacher_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher" ADD CONSTRAINT "student_teacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherStudentRelation" ADD CONSTRAINT "_TeacherStudentRelation_A_fkey" FOREIGN KEY ("A") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherStudentRelation" ADD CONSTRAINT "_TeacherStudentRelation_B_fkey" FOREIGN KEY ("B") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
