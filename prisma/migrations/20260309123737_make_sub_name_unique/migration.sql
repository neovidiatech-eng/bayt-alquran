/*
  Warnings:

  - A unique constraint covering the columns `[name_en]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name_ar]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_en_key" ON "subjects"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_ar_key" ON "subjects"("name_ar");
