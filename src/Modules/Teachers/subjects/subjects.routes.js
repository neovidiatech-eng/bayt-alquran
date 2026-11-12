import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { validation } from "../../../Middlewares/Validation.js";
import {
  authorize,
  authorizeResource,
} from "../../../Middlewares/AuthorizationMiddleware.js";
import * as subjectsController from "./subjects.controller.js";
import {
  createSubjectSchema,
  updateSubjectSchema,
  deleteSubjectSchema,
} from "./subjects.validation.js";
import { PERMISSIONS_V2 } from "../../../Constants/permissions.constants.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorize(PERMISSIONS_V2.SUBJECTS.READ),
  subjectsController.getSubjects,
);

router.post(
  "/create",
  authentication(),
  authorize(PERMISSIONS_V2.SUBJECTS.CREATE),
  validation(createSubjectSchema),
  subjectsController.createSubject,
);

router.patch(
  "/update/:id",
  authentication(),
  authorize(PERMISSIONS_V2.SUBJECTS.UPDATE),
  validation(updateSubjectSchema),
  subjectsController.updateSubject,
);

router.delete(
  "/delete/:id",
  authentication(),
  authorize(PERMISSIONS_V2.SUBJECTS.DELETE),
  validation(deleteSubjectSchema),
  subjectsController.deleteSubject,
);

export default router;
