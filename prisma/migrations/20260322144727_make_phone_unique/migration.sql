/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `stuff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `teacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "student_phone_key" ON "student"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "stuff_phone_key" ON "stuff"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_phone_key" ON "teacher"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");
