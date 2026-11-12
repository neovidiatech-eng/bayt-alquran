-- CreateTable
CREATE TABLE "moderator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_moderator" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_moderator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moderator_userId_key" ON "moderator"("userId");

-- AddForeignKey
ALTER TABLE "moderator" ADD CONSTRAINT "moderator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_moderator" ADD CONSTRAINT "student_moderator_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_moderator" ADD CONSTRAINT "student_moderator_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "moderator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
