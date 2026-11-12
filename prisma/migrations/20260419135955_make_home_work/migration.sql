/*
  Warnings:

  - You are about to drop the column `requestId` on the `schedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "schedule" DROP CONSTRAINT "schedule_requestId_fkey";

-- DropIndex
DROP INDEX "schedule_requestId_key";

-- AlterTable
ALTER TABLE "schedule" DROP COLUMN "requestId";

-- AddForeignKey
ALTER TABLE "session_request" ADD CONSTRAINT "session_request_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
