import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../Middlewares/Validation.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as ranksController from "./ranks.controller.js";
import * as ranksValidation from "./ranks.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.RANKS.READ),
  ranksController.getAllRanks
);

router.get(
  "/:id",
  authentication(),
  authorize(PERMISSIONS_V2.RANKS.READ),
  validation(ranksValidation.getRankByIdSchema),
  ranksController.getRankById
);

router.post(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.RANKS.CREATE),
  validation(ranksValidation.createRankSchema),
  ranksController.createRank
);

router.patch(
  "/assign",
  authentication(),
  authorize(PERMISSIONS_V2.RANKS.UPDATE),
  validation(ranksValidation.assignStudentRankSchema),
  ranksController.assignStudentRank
);

router.patch(
  "/:id",
  authentication(),
  authorize(PERMISSIONS_V2.RANKS.UPDATE),
  validation(ranksValidation.updateRankSchema),
  ranksController.updateRank
);

router.delete(
  "/:id",
  authentication(),
  authorize(PERMISSIONS_V2.RANKS.DELETE),
  validation(ranksValidation.deleteRankSchema),
  ranksController.deleteRank
);

export default router;
