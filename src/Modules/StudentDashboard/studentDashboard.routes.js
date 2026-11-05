import { Router } from "express";
import profileRouter from "./Profile/profile.routes.js";
import * as profileController from "./Profile/profile.controller.js";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";

const router = Router();
router.use("/profile", profileRouter);

router.get(
  "/dashboard",
  authentication(),
  authorize(PERMISSIONS_V2.PROFILE.VIEW),
  profileController.getDashboardStats,
);

export default router;