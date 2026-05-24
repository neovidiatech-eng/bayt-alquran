-- AlterTable
ALTER TABLE "permission" ADD COLUMN     "method" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "resource" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "code" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "permission_resource_idx" ON "permission"("resource");

-- CreateIndex
CREATE INDEX "permission_method_idx" ON "permission"("method");
