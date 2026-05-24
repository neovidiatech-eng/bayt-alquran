/*
  Warnings:

  - You are about to drop the column `created_at` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `teacher` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `teacher` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `stuff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `teacher` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "schedule" ADD COLUMN     "subjectId" TEXT NOT NULL DEFAULT 'null';

-- AlterTable
ALTER TABLE "student" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "stuff" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "teacher" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
