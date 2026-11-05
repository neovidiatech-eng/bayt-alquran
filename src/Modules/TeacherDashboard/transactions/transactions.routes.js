import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorizeResource } from "../../../Middlewares/AuthorizationMiddleware.js";
import * as transactionsController from "./transactions.controller.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorizeResource("finances"),
  transactionsController.getTeacherTransactions,
);

export default router;
