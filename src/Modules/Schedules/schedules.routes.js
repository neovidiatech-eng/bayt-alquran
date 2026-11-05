import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource, authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as scheduleController from "./schedules.controller.js";
import * as schema from "./schedules.validation.js";

const router = Router();

// Admin/Staff: Create and get sessions
router.get("/", authentication(), authorizeResource("sessions"), scheduleController.getAllSchedules);
router.get("/user/schedules", authentication(), authorizeResource("sessions"), scheduleController.getUserSchedules);
router.post(
  "/create-one",
  authentication(),
  authorizeResource("sessions"),
  validation(schema.createSchedule),
  scheduleController.createSchedule,
);
router.post(
  "/create-recurring",
  authentication(),
  authorizeResource("sessions"),
  validation(schema.createRecurringSchedule),
  scheduleController.createRecurringSchedule,
);

router.delete(
  "/:id",
  authentication(),
  authorizeResource("sessions"),
  validation(schema.deleteSchedule),
  scheduleController.deleteSchedule,
);

router.delete(
  "/group/:parent_recurring_id",
  authentication(),
  authorizeResource("sessions"),
  validation(schema.deleteRecurringGroup),
  scheduleController.deleteRecurringGroup,
);

router.patch(
  "/:id",
  authentication(),
  authorizeResource("sessions"),
  validation(schema.updateSchedule),
  scheduleController.updateSchedule,
);

router.post("/:id/join", authentication(), authorize(PERMISSIONS_V2.SESSIONS.JOIN), validation(schema.joinSession), scheduleController.joinSession);
router.post("/:id/leave", authentication(), authorize(PERMISSIONS_V2.SESSIONS.LEAVE), validation(schema.leaveSession), scheduleController.leaveSession);
router.post("/:id/review", authentication(), authorize(PERMISSIONS_V2.SESSIONS.READ), validation(schema.submitReview), scheduleController.submitReview);

export default router;
