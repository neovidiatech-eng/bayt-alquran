import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorize, authorizeResource } from "../../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../../Middlewares/Validation.js";
import * as TransactionsController from "./Transactions.controller.js";
import * as TransactionsValidation from "./Transactions.validation.js";
import { PERMISSIONS_V2 } from "../../../Constants/permissions.constants.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.READ),
  validation(TransactionsValidation.getTransactionsSchema),
  TransactionsController.getTransactions,
);

router.get(
  "/zero",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.MANAGE),
  TransactionsController.zeroing,
);

router.get(
  "/stats",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.READ),
  validation(TransactionsValidation.getTransactionsStatsSchema),
  TransactionsController.getTransactionStats,
);

export default router;
