import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import * as examsController from "./exams.controller.js";
import * as schema from "./exams.validation.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorizeResource("exams"),
  validation(schema.createExam),
  examsController.createExam,
);

router.delete(
  "/:id",
  authentication(),
  authorizeResource("exams"),
  validation(schema.deleteExam),
  examsController.deleteExam,
);

router.get(
  "/exam/:id",
  authentication(),
  authorizeResource("exams"),
  validation(schema.getExam),
  examsController.getExam,
);

router.get(
  "/user-exams",
  authentication(),
  authorizeResource("exams"),
  examsController.getStudentExams,
);

router.patch(
  "/:id",
  authentication(),
  authorizeResource("exams"),
  validation(schema.updateHomework),
  examsController.updateExam,
);

router.get(
  "/",
  authentication(),
  authorizeResource("exams"),
  validation(schema.getAllExams),
  examsController.getAllExams,
);

export default router;
