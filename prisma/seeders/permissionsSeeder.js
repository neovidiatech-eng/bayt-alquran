import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { PERMISSIONS_V2 } from "../../src/Constants/permissions.constants.js";
import { getRolePermissionCodes, rolesList } from "./rolePermissionDefinitions.js";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


export async function seedPermissions() {
  console.log("--- Starting Permissions & Roles Seeding ---");

  // 1. Seed Roles
  const rolesMap = {};
  for (const roleName of rolesList) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { name: roleName },
      create: { name: roleName },
    });
    rolesMap[roleName] = role.id;
    console.log(`Seeded role: ${roleName}`);
  }

  // 2. Extract and Seed Permissions from PERMISSIONS_V2
  const permissionCodes = Object.values(PERMISSIONS_V2).flatMap((resourceObj) =>
    Object.values(resourceObj)
  );

  const permissionIdsMap = {};
  const allSeededPermissions = [];

  for (const code of permissionCodes) {
    // Parse resource and method from "resource:method"
    const [resource, method] = code.split(":");
    const name = code.toUpperCase().replace(":", "_");

    const permission = await prisma.permission.upsert({
      where: { code: code },
      update: {
        name,
        resource: resource || "",
        method: method || "",
      },
      create: {
        code,
        name,
        resource: resource || "",
        method: method || "",
      },
    });

    permissionIdsMap[code] = permission.id;
    allSeededPermissions.push(permission);
  }

  console.log(`Seeded ${allSeededPermissions.length} permissions successfully.`);

  // 3. Map Roles to Permissions
  const rolePermissionsToSeed = [];
  const rolePermissionCodes = getRolePermissionCodes();

  for (const [roleName, codes] of Object.entries(rolePermissionCodes)) {
    if (codes === "ALL") {
      for (const perm of allSeededPermissions) {
        rolePermissionsToSeed.push({
          roleId: rolesMap[roleName],
          permissionId: perm.id,
        });
      }
      continue;
    }

    for (const code of codes.filter(Boolean)) {
      const permissionId = permissionIdsMap[code];
      if (permissionId) {
        rolePermissionsToSeed.push({
          roleId: rolesMap[roleName],
          permissionId,
        });
      }
    }
  }

  // Batch insert/upsert role permissions mappings
  for (const rp of rolePermissionsToSeed) {
    if (!rp.roleId || !rp.permissionId) continue;
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rp.roleId,
          permissionId: rp.permissionId,
        },
      },
      update: {},
      create: rp,
    });
  }

  console.log("Successfully mapped roles to permissions.");
  console.log("--- Permissions & Roles Seeding Completed ---");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPermissions()
    .catch((e) => {
      console.error("Error seeding permissions:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
