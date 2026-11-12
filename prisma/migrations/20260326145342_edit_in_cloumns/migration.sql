/*
  Warnings:

  - You are about to drop the column `end_Time` on the `schedule` table. All the data in the column will be lost.
  - You are about to drop the column `start_Time` on the `schedule` table. All the data in the column will be lost.
  - Added the required column `end_time` to the `schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "schedule" DROP COLUMN "end_Time",
DROP COLUMN "start_Time",
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL;
