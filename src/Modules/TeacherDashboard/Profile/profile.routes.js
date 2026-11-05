import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorize } from "../../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../../Middlewares/Validation.js";
import { PERMISSIONS_V2 } from "../../../Constants/permissions.constants.js";
import * as profileController from "./profile.controller.js";
import * as profileValidation from "./profile.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.PROFILE.VIEW),
  profileController.getProfile,
);

router.patch(
  "/meeting-link",
  authentication(),
  validation(profileValidation.updateMeetingLink),
  authorize(PERMISSIONS_V2.PROFILE.UPDATE),
  profileController.updateProfileMeetingLink,
);

router.get(
  "/dashboard",
  authentication(),
  authorize(PERMISSIONS_V2.PROFILE.VIEW),
  profileController.getDashboardStats,
);

export default router;
