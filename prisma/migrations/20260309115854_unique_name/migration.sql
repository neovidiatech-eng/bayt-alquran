/*
  Warnings:

  - A unique constraint covering the columns `[name_en]` on the table `Plans` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name_ar]` on the table `Plans` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Plans_name_en_key" ON "Plans"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "Plans_name_ar_key" ON "Plans"("name_ar");
