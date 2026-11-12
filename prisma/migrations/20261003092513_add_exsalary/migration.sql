-- AlterTable
ALTER TABLE "moderator" ADD COLUMN     "expected_salary" DOUBLE PRECISION,
ALTER COLUMN "salary" DROP NOT NULL;
