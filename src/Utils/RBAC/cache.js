import { redis } from "../Radis/Connection.js";

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

  async invalidateRoleCache(roleId) {
    try {
      await redis.del(this.getRolePermissionsKey(roleId));
    } catch (err) {
      console.error("Redis invalidate error:", err);
    }
  }
};
