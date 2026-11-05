import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource, authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as withdrawalController from "./withdrawals.controller.js";
import * as schema from "./withdrawals.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorizeResource("withdrawals"),
  withdrawalController.getWithdrawals
);
router.get(
  "/all",
  authentication(),
  authorizeResource("withdrawals"),
  withdrawalController.getAllWithdrawals
);
router.post(
  "/request",
  authentication(),
  authorizeResource("withdrawals"),
  validation(schema.requestWithdrawal),
  withdrawalController.requestWithdrawal
);

router.patch(
  "/:id/approve",
  authentication(),
  authorize(PERMISSIONS_V2.WITHDRAWALS.APPROVE),
  validation(schema.processWithdrawal),
  withdrawalController.approveWithdrawal
);

router.patch(
  "/:id/reject",
  authentication(),
  authorize(PERMISSIONS_V2.WITHDRAWALS.APPROVE),
  validation(schema.processWithdrawal),
  withdrawalController.rejectWithdrawal
);

export default router;
