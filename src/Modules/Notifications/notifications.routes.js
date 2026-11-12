import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import * as notificationsController from "./notifications.controller.js";
import * as schema from "./notifications.validation.js";

const router = Router();

// Protect all routes in this router to authenticated users with admin/permission access
router.use(authentication());

router.get(
  "/",
  authorizeResource("notifications"),
  validation(schema.getAdminNotifications),
  notificationsController.getAdminNotifications,
);

router.post(
  "/",
  authorizeResource("notifications"),
  validation(schema.sendNotification),
  notificationsController.sendNotification,
);

router.patch(
  "/read-all",
  authorizeResource("notifications"),
  notificationsController.markAllAsRead,
);

router.patch(
  "/:id/read",
  authorizeResource("notifications"),
  validation(schema.markAsRead),
  notificationsController.markAsRead,
);

router.delete(
  "/:id",
  authorizeResource("notifications"),
  validation(schema.deleteNotification),
  notificationsController.deleteNotification,
);

export default router;
