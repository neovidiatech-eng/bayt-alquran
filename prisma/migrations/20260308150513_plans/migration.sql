-- CreateTable
CREATE TABLE "Plans" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "sessionsCount" INTEGER NOT NULL,
    "features" TEXT[],
    "currencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plans_currencyId_key" ON "Plans"("currencyId");

-- CreateIndex
CREATE INDEX "Plans_name_en_idx" ON "Plans"("name_en");

-- CreateIndex
CREATE INDEX "Plans_name_ar_idx" ON "Plans"("name_ar");

-- AddForeignKey
ALTER TABLE "Plans" ADD CONSTRAINT "Plans_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
