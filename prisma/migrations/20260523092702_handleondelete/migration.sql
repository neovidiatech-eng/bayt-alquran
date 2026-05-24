-- DropForeignKey
ALTER TABLE "Plans" DROP CONSTRAINT "Plans_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "teacher" DROP CONSTRAINT "teacher_currencyId_fkey";

-- AlterTable
ALTER TABLE "Plans" ALTER COLUMN "currencyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "teacher" ALTER COLUMN "currencyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Plans" ADD CONSTRAINT "Plans_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
