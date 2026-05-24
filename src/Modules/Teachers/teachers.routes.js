import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import * as teacherController from "./teachers.controller.js";
import { validation } from "../../Middlewares/Validation.js";
import {
  createTeacherSchema,
  getAllTeachersSchema,
  getTeacherSchema,
  updateTeacherSchema,
  deleteTeacherSchema,
} from "./teachers.validation.js";
import subjectsRouter from "./subjects/subjects.routes.js";

const router = Router();
router.use("/subjects", subjectsRouter);

router.get(
  "/",
  authentication(),
  authorizeResource("users"),
  validation(getAllTeachersSchema),
  teacherController.getAllTeachers,
);

router.get(
  "/my-students",
  authentication(),
  authorizeResource("users"),
  teacherController.getMyStudents,
);

router.post(
  "/create",
  authentication(),
  authorizeResource("users"),
  validation(createTeacherSchema),
  teacherController.createTeacher,
);

router.get(
  "/:id",
  authentication(),
  authorizeResource("users"),
  validation(getTeacherSchema),
  teacherController.getTeacher,
);

router.patch(
  "/update/:id",
  authentication(),
  authorizeResource("users"),
  validation(updateTeacherSchema),
  teacherController.updateTeacher,
);

router.delete(
  "/delete/:id",
  authentication(),
  authorizeResource("users"),
  validation(deleteTeacherSchema),
  teacherController.deleteTeacher,
);

export default router;
