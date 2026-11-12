import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { getRolePermissionCodes } from "./rolePermissionDefinitions.js";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedRolePermissions() {
  console.log("Start seeding role-permission mappings...");

  const allRoles = await prisma.role.findMany();
  const roleMap = allRoles.reduce((acc, role) => {
    acc[role.name] = role.id;
    return acc;
  }, {});

  const allPermissions = await prisma.permission.findMany();
  const permissionMap = allPermissions.reduce((acc, perm) => {
    acc[perm.code] = perm.id;
    return acc;
  }, {});

  const rolePermissionCodes = getRolePermissionCodes();
  const mappings = Object.entries(rolePermissionCodes)
    .flatMap(([roleName, codes]) => {
      if (codes === "ALL") {
        return allPermissions.map((permission) => ({
          roleId: roleMap[roleName],
          permissionId: permission.id,
        }));
      }

      return codes.map((code) => ({
        roleId: roleMap[roleName],
        permissionId: permissionMap[code],
      }));
    })
    .filter((mapping) => mapping.roleId && mapping.permissionId);

  await Promise.all(
    mappings.map((m) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: m.roleId,
            permissionId: m.permissionId,
          },
        },
        update: m,
        create: m,
      }),
    ),
  );

  console.log("Seeded role-permission mappings successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedRolePermissions()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
