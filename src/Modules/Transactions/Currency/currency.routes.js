import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorize } from "../../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../../Constants/permissions.constants.js";
import * as currencyController from "./currency.controller.js";
import { validation } from "../../../Middlewares/Validation.js";
import {
  getCurrenciesSchema,
  addCurrencySchema,
  updateCurrencySchema,
  deleteCurrencySchema,
  getCurrencyById,
} from "./currency.validation.js";

const router = Router();

router.get(
  "/currencies",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.READ),
  validation(getCurrenciesSchema),
  currencyController.getCurrencies,
);
router.get(
  "/:id",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.READ),
  validation(getCurrencyById),
  currencyController.getCurrencyById,
);
router.post(
  "/add-currency",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.UPDATE),
  validation(addCurrencySchema),
  currencyController.addCurrency,
);
router.patch(
  "/update-currency/:id",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.UPDATE),
  validation(updateCurrencySchema),
  currencyController.updateCurrency,
);

router.delete(
  "/delete-currency/:id",
  authentication(),
  authorize(PERMISSIONS_V2.SETTINGS.UPDATE),
  validation(deleteCurrencySchema),
  currencyController.deleteCurrency,
);
export default router;
