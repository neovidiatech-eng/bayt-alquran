import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as feedbackController from "./feedback.controller.js";
import { validation } from "../../Middlewares/Validation.js";
import * as feedbackValidation from "./feedback.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  validation(feedbackValidation.getFeedback),
  authorize(PERMISSIONS_V2.feedback.READ),
  feedbackController.getFeedback
);

export default router;
