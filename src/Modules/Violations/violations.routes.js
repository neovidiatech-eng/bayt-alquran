import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../Middlewares/Validation.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as violationsController from "./violations.controller.js";
import * as violationsValidation from "./violations.validation.js";

const router = Router();

/* ---------------- Infraction Item Templates ---------------- */
router.get(
  "/items",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.READ),
  violationsController.getInfractionItems,
);

router.post(
  "/items",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.MANAGE),
  validation(violationsValidation.createInfractionItemSchema),
  violationsController.createInfractionItem,
);

router.patch(
  "/items/:id",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.MANAGE),
  validation(violationsValidation.updateInfractionItemSchema),
  violationsController.updateInfractionItem,
);

router.delete(
  "/items/:id",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.MANAGE),
  validation(violationsValidation.deleteInfractionItemSchema),
  violationsController.deleteInfractionItem,
);

/* ---------------- Supervisor Violations & Warnings ---------------- */
router.post(
  "/issue",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.CREATE),
  validation(violationsValidation.issueTeacherViolationSchema),
  violationsController.issueTeacherViolation,
);

router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.READ),
  validation(violationsValidation.getTeacherViolationsSchema),
  violationsController.getTeacherViolations,
);
router.get(
  "/me",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.READ_MY_VIOLATIONS),
  validation(violationsValidation.getAuthTeacherViolationsSchema),
  violationsController.getAuthUserViolations,
);

/* ---------------- Supervisor Moderator Violations & Warnings ---------------- */
router.post(
  "/moderator/issue",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.CREATE),
  validation(violationsValidation.issueModeratorViolationSchema),
  violationsController.issueModeratorViolation,
);

router.get(
  "/moderator",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.READ),
  validation(violationsValidation.getModeratorViolationsSchema),
  violationsController.getModeratorViolations,
);

router.get(
  "/moderator/me",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.READ_MY_VIOLATIONS),
  validation(violationsValidation.getAuthModeratorViolationsSchema),
  violationsController.getAuthUserModeratorViolations,
);

router.delete(
  "/moderator/:id",
  authentication(),
  authorize(PERMISSIONS_V2.VIOLATIONS.MANAGE),
  validation(violationsValidation.deleteModeratorViolationSchema),
  violationsController.deleteModeratorViolation,
);

export default router;
