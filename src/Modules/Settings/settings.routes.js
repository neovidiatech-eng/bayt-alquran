import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../Middlewares/Validation.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as settingController from "./settings.controller.js";
import * as settingsValidation from "./settings.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.READ),
  settingController.getSettings,
);

router.patch(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.UPDATE),
  validation(settingsValidation.updateSettings),
  settingController.updateSettings,
);


export default router;

