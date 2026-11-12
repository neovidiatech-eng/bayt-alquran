import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import * as notificationsController from "./notifications.controller.js";
import * as schema from "./notifications.validation.js";

const router = Router();

// Protect all routes to authenticated users (teachers, students, parents, etc.)
router.use(authentication());

router.get(
  "/",
  validation(schema.getUserNotifications),
  notificationsController.getUserNotifications,
);

router.patch(
  "/read-all",
  notificationsController.markUserAllAsRead,
);

router.patch(
  "/:id/read",
  validation(schema.markAsRead),
  notificationsController.markUserAsRead,
);

router.delete(
  "/:id",
  validation(schema.deleteNotification),
  notificationsController.deleteUserNotification,
);

export default router;
