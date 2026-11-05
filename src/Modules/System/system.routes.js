import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource, authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as systemController from "./system.controller.js";
import {
  createRoleSchema,
  deleteRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  createPermissionSchema,
  deletePermissionSchema,

  revokePermissionsFromRoleSchema,
  assignPermissionsToRoleSchema,
} from "./system.validation.js";
import stuffRouter from "./stuff/stuff.routes.js";

const router = Router();

router.use("/stuff", stuffRouter);

router.get(
  "/roles",
  authentication(),
  authorizeResource("roles"),
  systemController.getAllRoles,
);

router.post(
  "/roles/create",
  authentication(),
  authorizeResource("roles"),
  validation(createRoleSchema),
  systemController.createRole,
);

router.post(
  "/roles/assign/:user_id",
  authentication(),
  authorize(PERMISSIONS_V2.ROLES.ASSIGN),
  validation(assignRoleSchema),
  systemController.assignRoleToUser,
);

router.patch(
  "/roles/:id",
  authentication(),
  authorizeResource("roles"),
  validation(updateRoleSchema),
  systemController.updateRole,
);

router.delete(
  "/roles/:id",
  authentication(),
  authorizeResource("roles"),
  validation(deleteRoleSchema),
  systemController.deleteRole,
);

router.get(
  "/dashboard",
  authentication(),
  authorize(PERMISSIONS_V2.DASHBOARD.READ),
  systemController.getDashboard,
);

// --- Permission CRUD & Assignment ---


router.post(
  "/permissions",
  authentication(),
  authorizeResource("permissions"),
  validation(createPermissionSchema),
  systemController.createPermission,
);

router.get(
  "/permissions",
  authentication(),
  authorizeResource("permissions"),
  systemController.getPermissions,
);

router.delete(
  "/permissions/:id",
  authentication(),
  authorizeResource("permissions"),
  validation(deletePermissionSchema),
  systemController.deletePermission,
);

router.post(
  "/roles/permissions/assign",
  authentication(),
  authorize(PERMISSIONS_V2.ROLES.UPDATE),
  validation(assignPermissionsToRoleSchema),
  systemController.assignPermissionsToRole,
);

router.post(
  "/roles/permissions/revoke",
  authentication(),
  authorize(PERMISSIONS_V2.ROLES.UPDATE),
  validation(revokePermissionsFromRoleSchema),
  systemController.revokePermissionsFromRole,
);

export default router;
