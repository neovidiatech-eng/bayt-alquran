-- CreateTable
CREATE TABLE "student" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_country" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "confirm_at" TIMESTAMP(3),
    "planId" TEXT,
    "country" TEXT NOT NULL,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_user_id_key" ON "student"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_email_key" ON "student"("email");

-- CreateIndex
CREATE INDEX "student_email_idx" ON "student"("email");

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
