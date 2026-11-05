import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorizeResource } from "../../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../../Middlewares/Validation.js";
import * as TransactionsController from "./Transactions.controller.js";
import * as TransactionsValidation from "./Transactions.validation.js";

const router = Router();

router.get("/",
  authentication(),
  authorizeResource("finances"),
  validation(TransactionsValidation.getTransactionsSchema),
  TransactionsController.getTransactions,
);

router.get("/stats",
  authentication(),
  authorizeResource("finances"),
  validation(TransactionsValidation.getTransactionsStatsSchema),
  TransactionsController.getTransactionStats,
);

export default router;
