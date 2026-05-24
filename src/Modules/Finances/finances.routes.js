import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as financesController from "./finances.controller.js";
import * as schema from "./finances.validation.js";
import { validation } from "../../Middlewares/Validation.js";

const router = Router();

router.get(
  "/expenses",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.READ),
  validation(schema.getExpensesValidation),
  financesController.getExpenses,
);

router.get(
  "/expenses/:id",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.READ),
  validation(schema.getExpenseByIdValidation),
  financesController.getExpenseById,
);

router.post(
  "/expenses",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.MANAGE),
  validation(schema.createExpenseValidation),
  financesController.createExpense,
);

router.patch(
  "/expenses/:id",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.MANAGE),
  validation(schema.updateExpenseValidation),
  financesController.updateExpense,
);

router.delete(
  "/expenses/:id",
  authentication(),
  authorize(PERMISSIONS_V2.FINANCES.MANAGE),
  validation(schema.deleteExpenseValidation),
  financesController.deleteExpense,
);

export default router;
