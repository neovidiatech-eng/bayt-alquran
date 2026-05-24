import { Router } from "express";
import { authentication } from "../../../Middlewares/Authentication.js";
import { validation } from "../../../Middlewares/Validation.js";
import { authorizeResource } from "../../../Middlewares/AuthorizationMiddleware.js";
import * as subjectsController from "./subjects.controller.js";
import {
  createSubjectSchema,
  updateSubjectSchema,
  deleteSubjectSchema,
} from "./subjects.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorizeResource("subjects"),
  subjectsController.getSubjects,
);

router.post(
  "/create",
  authentication(),
  authorizeResource("subjects"),
  validation(createSubjectSchema),
  subjectsController.createSubject,
);

router.patch(
  "/update/:id",
  authentication(),
  authorizeResource("subjects"),
  validation(updateSubjectSchema),
  subjectsController.updateSubject,
);

router.delete(
  "/delete/:id",
  authentication(),
  authorizeResource("subjects"),
  validation(deleteSubjectSchema),
  subjectsController.deleteSubject,
);

export default router;
