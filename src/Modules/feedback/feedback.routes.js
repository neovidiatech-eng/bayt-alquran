import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import * as feedbackController from "./feedback.controller.js";
import { validation } from "../../Middlewares/Validation.js";
import * as schema from "./feedback.validation.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";

const router = Router();
router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.FEEDBACK.READ),
  validation(schema.getFeedbacks),
  feedbackController.getFeedbacks,
);
router.get(
  "/:feedback_id",
  authentication(),
  authorize(PERMISSIONS_V2.FEEDBACK.READ),
  validation(schema.getFeedback),
  feedbackController.getFeedback,
);

export default router;
