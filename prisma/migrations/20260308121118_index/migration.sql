/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `currency` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "currency_code_key" ON "currency"("code");

-- CreateIndex
CREATE INDEX "currency_code_idx" ON "currency"("code");
