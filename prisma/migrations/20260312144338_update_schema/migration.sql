-- DropForeignKey
ALTER TABLE "rolePermission" DROP CONSTRAINT "rolePermission_permissionId_fkey";

-- AddForeignKey
ALTER TABLE "rolePermission" ADD CONSTRAINT "rolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
