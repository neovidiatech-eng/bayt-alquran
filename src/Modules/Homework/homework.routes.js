import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource, authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import * as homeworkController from "./homework.controller.js";
import * as schema from "./homework.validation.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorizeResource("homework"),
  validation(schema.createHomework),
  homeworkController.createHomework,
);

router.patch(
  "/:id",
  authentication(),
  authorizeResource("homework"),
  validation(schema.updateHomework),
  homeworkController.updateHomework,
);

router.delete(
  "/:id",
  authentication(),
  authorizeResource("homework"),
  validation(schema.deleteHomework),
  homeworkController.deleteHomework,
);

router.get(
  "/student/:id",
  authentication(),
  authorizeResource("homework"),
  validation(schema.getHomework),
  homeworkController.getHomework,
);

router.get(
  "/student-homework",
  authentication(),
  authorize(PERMISSIONS_V2.HOMEWORK.READ_STUDENT_HOMEWORK),
  homeworkController.getStudentHomework,
);

router.get(
  "/",
  authentication(),
  authorizeResource("homework"),
  validation(schema.getAllHomework),
  homeworkController.getAllHomework,
);

export default router;