-- CreateTable
CREATE TABLE "moderatorViolation" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "infractionItemId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'warning',
    "deductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "moderatorViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderatorViolation_moderatorId_idx" ON "moderatorViolation"("moderatorId");

-- CreateIndex
CREATE INDEX "moderatorViolation_supervisorId_idx" ON "moderatorViolation"("supervisorId");

-- CreateIndex
CREATE INDEX "moderatorViolation_scheduleId_idx" ON "moderatorViolation"("scheduleId");

-- AddForeignKey
ALTER TABLE "moderatorViolation" ADD CONSTRAINT "moderatorViolation_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "moderator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderatorViolation" ADD CONSTRAINT "moderatorViolation_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderatorViolation" ADD CONSTRAINT "moderatorViolation_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderatorViolation" ADD CONSTRAINT "moderatorViolation_infractionItemId_fkey" FOREIGN KEY ("infractionItemId") REFERENCES "InfractionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderatorViolation" ADD CONSTRAINT "moderatorViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
