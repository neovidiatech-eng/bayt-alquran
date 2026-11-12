import { asyncHandler } from "../Utils/Response.js";
import { isAdmin } from "../Utils/Permissions/permissions.js";

/**
 * Helper to ensure the request has the user's permissions cached in req.permissions Set.
 */
const ensurePermissions = (req) => {
  if (!req.permissions) {
    if (!req.user) {
      req.permissions = new Set();
    } else {
      // Get permissions set from user
      if (req.user.role?.rolePermissions) {
        req.permissions = new Set(
          req.user.role.rolePermissions
            .map((rp) => rp.permission?.code)
            .filter(Boolean)
        );
      } else {
        req.permissions = new Set();
      }
    }
  }
};

/**
 * Checks if a user has a specific permission.
 */
export const authorize = (permissionCode) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new Error("UNAUTHORIZED", { cause: 401 }));
    }

    // Bypass check for admin / super_admin
    if (isAdmin(req.user)) {
      return next();
    }

    ensurePermissions(req);

    if (!req.permissions.has(permissionCode)) {
      return next(new Error("FORBIDDEN", { cause: 403 }));
    }

    next();
  });
};

/**
 * Dynamic resource middleware: Maps HTTP method to corresponding CRUD action.
 */
export const authorizeResource = (resourceName) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new Error("UNAUTHORIZED", { cause: 401 }));
    }

    // Bypass check for admin / super_admin
    if (isAdmin(req.user)) {
      return next();
    }

    ensurePermissions(req);

    const method = req.method.toUpperCase();
    let action = "read"; // default for GET

    if (method === "POST") {
      action = "create";
    } else if (method === "PUT" || method === "PATCH") {
      action = "update";
    } else if (method === "DELETE") {
      action = "delete";
    }

    const permissionCode = `${resourceName}:${action}`;

    if (!req.permissions.has(permissionCode)) {
      return next(new Error("FORBIDDEN", { cause: 403 }));
    }

    next();
  });
};
