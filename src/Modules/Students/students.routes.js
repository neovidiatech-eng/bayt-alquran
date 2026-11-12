import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize, authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../Middlewares/Validation.js";
import {
  createStudentSchema,
  updateStudentSchema,
  studentIdSchema,
  updateStudentPlanSchema,
  getAllStudentsSchema,
} from "./students.validation.js";
import * as studentController from "../Students/students.controller.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";

const router = Router();

router.get(
  "/",
  authentication(),
authorize(PERMISSIONS_V2.STUDENTS.READ),
validation(getAllStudentsSchema),
  studentController.getAllStudents,
);

router.patch(
  "/updatePlan/:id",
  authentication(),
  authorizeResource("students"),
  validation(updateStudentPlanSchema),
  studentController.updateStudentPlan,
);

/* router.get(
  "/stats",
  authentication(),
  authorizeResource("students"),
  studentController.getStudentsStats,
);
 */
router.post(
  "/create",
  authentication(),
  authorizeResource("students"),
  validation(createStudentSchema),
  studentController.createStudent,
);

router.get(
  "/:id",
  authentication(),
  authorizeResource("students"),
  validation(studentIdSchema),
  studentController.getStudentById,
);

router.patch(
  "/update/:id",
  authentication(),
  authorizeResource("students"),
  validation(updateStudentSchema),
  studentController.updateStudent,
);

router.delete(
  "/:id",
  authentication(),
  authorizeResource("students"),
  validation(studentIdSchema),
  studentController.deleteStudent,
);

export default router;
