-- CreateTable
CREATE TABLE "InfractionItem" (
    "id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "description" TEXT,
    "defaultType" TEXT NOT NULL DEFAULT 'warning',
    "defaultDeductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfractionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherViolation" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "infractionItemId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'warning',
    "deductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherViolation_teacherId_idx" ON "TeacherViolation"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherViolation_supervisorId_idx" ON "TeacherViolation"("supervisorId");

-- CreateIndex
CREATE INDEX "TeacherViolation_scheduleId_idx" ON "TeacherViolation"("scheduleId");

-- AddForeignKey
ALTER TABLE "TeacherViolation" ADD CONSTRAINT "TeacherViolation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherViolation" ADD CONSTRAINT "TeacherViolation_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherViolation" ADD CONSTRAINT "TeacherViolation_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherViolation" ADD CONSTRAINT "TeacherViolation_infractionItemId_fkey" FOREIGN KEY ("infractionItemId") REFERENCES "InfractionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
