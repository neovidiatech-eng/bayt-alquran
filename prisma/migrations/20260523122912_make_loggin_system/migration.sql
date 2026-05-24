-- CreateTable
CREATE TABLE "auth_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_log_userId_idx" ON "auth_log"("userId");

-- CreateIndex
CREATE INDEX "auth_log_action_idx" ON "auth_log"("action");

-- AddForeignKey
ALTER TABLE "auth_log" ADD CONSTRAINT "auth_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
