import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorizeResource } from "../../../Middlewares/AuthorizationMiddleware.js";
import * as plans from "./plans.controller.js";
import { validation } from "../../../Middlewares/Validation.js";
import {
  createPlanSchema,
  deletePlanSchema,
  updatePlanSchema,
} from "./plans.validation.js";

const router = Router();
router.get("/", plans.getAllPlans);

router.post(
  "/",
  authentication(),
  authorizeResource("plans"),
  validation(createPlanSchema),
  plans.createPlan,
);
router.patch(
  "/:id",
  authentication(),
  authorizeResource("plans"),
  validation(updatePlanSchema),
  plans.updatePlan,
);
router.delete(
  "/:id",
  authentication(),
  authorizeResource("plans"),
  validation(deletePlanSchema),
  plans.deletePlan,
);

export default router;
