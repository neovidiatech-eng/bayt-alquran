-- CreateTable
CREATE TABLE "stuff" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_country" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "confirm_at" TIMESTAMP(3),
    "roleId" TEXT,

    CONSTRAINT "stuff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stuff_user_id_key" ON "stuff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stuff_email_key" ON "stuff"("email");

-- CreateIndex
CREATE INDEX "stuff_email_idx" ON "stuff"("email");

-- AddForeignKey
ALTER TABLE "stuff" ADD CONSTRAINT "stuff_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stuff" ADD CONSTRAINT "stuff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
