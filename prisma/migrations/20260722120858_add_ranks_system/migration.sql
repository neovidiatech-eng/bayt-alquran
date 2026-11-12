-- AlterTable
ALTER TABLE "student" ADD COLUMN     "rankId" TEXT;

-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "color" TEXT DEFAULT '#369589',
    "icon" TEXT,
    "minSessions" INTEGER NOT NULL DEFAULT 0,
    "minPoints" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rank_name_en_key" ON "Rank"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_name_ar_key" ON "Rank"("name_ar");

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
