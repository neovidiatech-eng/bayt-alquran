-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subjects_name_en_idx" ON "subjects"("name_en");

-- CreateIndex
CREATE INDEX "subjects_name_ar_idx" ON "subjects"("name_ar");
