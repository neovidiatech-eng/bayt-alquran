import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorize } from "../../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../../Constants/permissions.constants.js";
import * as profileController from "./profile.controller.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.PROFILE.VIEW),
  profileController.getProfile,
);

router.get(
  "/dashboard",
  authentication(),
  authorize(PERMISSIONS_V2.PROFILE.VIEW),
  profileController.getDashboardStats,
);

export default router;
