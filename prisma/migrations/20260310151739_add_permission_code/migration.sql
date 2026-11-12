/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `permission` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "permission" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_name_idx" ON "permission"("name");

-- CreateIndex
CREATE INDEX "permission_code_idx" ON "permission"("code");
