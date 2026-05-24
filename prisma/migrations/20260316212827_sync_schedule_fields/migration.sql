/*
  Warnings:

  - Added the required column `description` to the `schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `link` to the `schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "schedule" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "endTime" TEXT NOT NULL,
ADD COLUMN     "link" TEXT NOT NULL,
ADD COLUMN     "startTime" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
