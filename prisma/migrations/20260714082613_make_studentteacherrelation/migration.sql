-- AlterTable
ALTER TABLE "student_teacher" ALTER COLUMN "hour_price" DROP NOT NULL,
ALTER COLUMN "hour_price" SET DEFAULT 0;
