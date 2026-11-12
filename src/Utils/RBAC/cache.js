import { redis } from "../Redis/Connection.js";
import * as db from "../../database/dbService.js";

const CACHE_TTL = 3600; // Cache permissions for 1 hour

export const rbacCache = {
  getRolePermissionsKey(roleId) {
    return `rbac:role:${roleId}:permissions`;
  },

  async getRolePermissions(roleId) {
    try {
      const data = await redis.get(this.getRolePermissionsKey(roleId));
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Redis get error:", err);
      return null;
    }
  },

  async setRolePermissions(roleId, permissions) {
    try {
      await redis.set(
        this.getRolePermissionsKey(roleId),
        JSON.stringify(permissions),
        { EX: CACHE_TTL }
      );
    } catch (err) {
      console.error("Redis set error:", err);
    }
  },

  async invalidateUserCache(userId) {
    try {
      if (userId) {
        await redis.del(`user:${userId}`);
      }
    } catch (err) {
      console.error("Redis invalidate user error:", err);
    }
  },

  async invalidateRoleCache(roleId) {
    try {
      if (!roleId) return;
      await redis.del(this.getRolePermissionsKey(roleId));

      const userIds = new Set();

      // Find users with user.roleId or matching stuff/teacher relations
      const users = await db.findMany({
        model: "user",
        where: {
          OR: [
            { roleId },
            { stuff: { roleId } },
            { teacher: { roleId } },
          ],
        },
        select: { id: true },
      });
      users.forEach((u) => userIds.add(u.id));

      // Find users directly from stuff table
      const stuffUsers = await db.findMany({
        model: "stuff",
        where: { roleId },
        select: { user_id: true },
      });
      stuffUsers.forEach((s) => userIds.add(s.user_id));

      // Find users directly from teacher table
      const teacherUsers = await db.findMany({
        model: "teacher",
        where: { roleId },
        select: { user_id: true },
      });
      teacherUsers.forEach((t) => userIds.add(t.user_id));

      for (const userId of userIds) {
        if (userId) {
          await redis.del(`user:${userId}`);
        }
      }
    } catch (err) {
      console.error("Redis invalidate role error:", err);
    }
  },
};

