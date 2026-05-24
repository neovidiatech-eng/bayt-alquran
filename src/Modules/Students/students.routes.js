import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../Middlewares/Validation.js";
import {
  createStudentSchema,
  updateStudentSchema,
  studentIdSchema,
} from "./students.validation.js";
import * as studentController from "../Students/students.controller.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorizeResource("users"),
  studentController.getAllStudents,
);

router.post(
  "/create",
  authentication(),
  authorizeResource("users"),
  validation(createStudentSchema),
  studentController.createStudent,
);

router.get(
  "/:id",
  authentication(),
  authorizeResource("users"),
  validation(studentIdSchema),
  studentController.getStudentById,
);

router.patch(
  "/update/:id",
  authentication(),
  authorizeResource("users"),
  validation(updateStudentSchema),
  studentController.updateStudent,
);

router.delete(
  "/:id",
  authentication(),
  authorizeResource("users"),
  validation(studentIdSchema),
  studentController.deleteStudent,
);

export default router;
