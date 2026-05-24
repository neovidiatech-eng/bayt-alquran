import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../Middlewares/Validation.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as settingController from "./settings.controller.js";
import * as settingsValidation from "./settings.validation.js";

const router = Router();

router.get(
  "/late-discount",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.VIEW_LATE_DISCOUNT),
  settingController.getLateDiscount,
);

router.patch(
  "/late-discount",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.UPDATE),
  validation(settingsValidation.updateLateDiscount),
  settingController.updateLateDiscount,
);

export default router;
