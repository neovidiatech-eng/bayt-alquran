import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource, authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as recitationController from "./dailyQuranRecitation.controller.js";
import * as schema from "./dailyQuranRecitation.validation.js";

const router = Router();

// Logged-in student recitations
router.get(
  "/my-recitations",
  authentication(),
  authorize(PERMISSIONS_V2.DAILY_QURAN_RECITATION.READ_MY_RECITATIONS),
  validation(schema.getStudentDailyQuranRecitations),
  recitationController.getStudentDailyQuranRecitations,
);

router.get(
  "/teacher-recitations",
  authentication(),
  authorize(PERMISSIONS_V2.DAILY_QURAN_RECITATION.READ_TEACHER_RECITATIONS),
  validation(schema.getTeacherDailyQuranRecitations),
  recitationController.getTeacherDailyQuranRecitations,
);

// General CRUD Endpoints
router.post(
  "/",
  authentication(),
  authorizeResource("daily_quran_recitation"),
  validation(schema.createDailyQuranRecitation),
  recitationController.createDailyQuranRecitation,
);

router.get(
  "/",
  authentication(),
  authorizeResource("daily_quran_recitation"),
  validation(schema.getAllDailyQuranRecitations),
  recitationController.getAllDailyQuranRecitations,
);

router.get(
  "/:id",
  authentication(),
  validation(schema.getDailyQuranRecitationById),
  recitationController.getDailyQuranRecitationById,
);


router.put(
  "/submit-recitation/:id",
  authentication(),
  validation(schema.submitRecitation),
  recitationController.submitRecitation,
);
router.patch(
  "/:id",
  authentication(),
  validation(schema.updateDailyQuranRecitation),
  recitationController.updateDailyQuranRecitation,
);

router.delete(
  "/:id",
  authentication(),
  authorizeResource("daily_quran_recitation"),
  validation(schema.deleteDailyQuranRecitation),
  recitationController.deleteDailyQuranRecitation,
);

export default router;
