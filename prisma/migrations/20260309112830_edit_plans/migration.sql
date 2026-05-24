-- AlterTable
ALTER TABLE "Plans" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bestSeller" BOOLEAN NOT NULL DEFAULT false;
