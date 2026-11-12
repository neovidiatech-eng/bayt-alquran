-- DropForeignKey
ALTER TABLE "stuff" DROP CONSTRAINT "stuff_user_id_fkey";

-- AlterTable
ALTER TABLE "stuff" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "stuff" ADD CONSTRAINT "stuff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
