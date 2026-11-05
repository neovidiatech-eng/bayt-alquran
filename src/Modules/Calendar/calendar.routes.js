import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import * as calendarController from "./calendar.controller.js";
import { validation } from "../../Middlewares/Validation.js";
import * as schema from "./calendar.validation.js";

const router = Router();
router.get(
  "/",
  authentication(),
  authorizeResource("calendar"),
  validation(schema.getCalendar),
  calendarController.getCalendar,
);
router.get(
  "/student",
  authentication(),
  authorizeResource("calendar"),
  validation(schema.getStudentCalendar),
  calendarController.getStudentCalendar,
);
router.get(
  "/teacher",
  authentication(),
  authorizeResource("calendar"),
  validation(schema.getTeacherCalendar),
  calendarController.getTeacherCalendar,
);
router.get(
  "/teachers",
  authentication(),
  authorizeResource("calendar"),
  validation(schema.getTeachersCalendar),
  calendarController.getTeachersCalendar,
);

export default router;
