/*
  Warnings:

  - A unique constraint covering the columns `[rescheduledToId]` on the table `schedule` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rescheduledFromId]` on the table `schedule` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[requestId]` on the table `schedule` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "schedule" ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "rescheduledFromId" TEXT,
ADD COLUMN     "rescheduledToId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'scheduled';

-- CreateTable
CREATE TABLE "session_request" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "requesterId" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "requestedData" JSONB,
    "adminId" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_rescheduledToId_key" ON "schedule"("rescheduledToId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_rescheduledFromId_key" ON "schedule"("rescheduledFromId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_requestId_key" ON "schedule"("requestId");

-- CreateIndex
CREATE INDEX "schedule_status_idx" ON "schedule"("status");

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_rescheduledToId_fkey" FOREIGN KEY ("rescheduledToId") REFERENCES "schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "session_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_request" ADD CONSTRAINT "session_request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
