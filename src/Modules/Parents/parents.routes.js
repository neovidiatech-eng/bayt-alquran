import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import { validation } from "../../Middlewares/Validation.js";
import {
  getAllParentsSchema,
  getParentSchema,
  createParentSchema,
  updateParentSchema,
  deleteParentSchema,
  studentIdSchema,
} from "./parents.validation.js";
import * as parentController from "./parents.controller.js";
import { isParent, verifyStudentBelongsToParent } from "./parents.middleware.js";

const router = Router();

// Admin routes for parent management (get all, get single, create, update, delete)
router.get(
  "/admins",
  authentication(),
  authorizeResource("parents"),
  validation(getAllParentsSchema),
  parentController.getAllParents
);

router.get(
  "/admins/:id",
  authentication(),
  authorizeResource("parents"),
  validation(getParentSchema),
  parentController.getParent
);

router.post(
  "/admins",
  authentication(),
  authorizeResource("parents"),
  validation(createParentSchema),
  parentController.createParent
);

router.patch(
  "/admins/:id",
  authentication(),
  authorizeResource("parents"),
  validation(updateParentSchema),
  parentController.updateParent
);

router.delete(
  "/admins/:id",
  authentication(),
  authorizeResource("parents"),
  validation(deleteParentSchema),
  parentController.deleteParent
);

// Parent routes - require authentication and parent role
router.use(authentication());

router.get("/students", parentController.getLinkedStudents);

router.get(
  "/students/:studentId/homeworks",
  validation(studentIdSchema),
  verifyStudentBelongsToParent(),
  parentController.getStudentHomeworks
);

router.get(
  "/students/:studentId/exams",
  validation(studentIdSchema),
  verifyStudentBelongsToParent(),
  parentController.getStudentExams
);

router.get(
  "/students/:studentId/sessions",
  validation(studentIdSchema),
  verifyStudentBelongsToParent(),
  parentController.getStudentSessions
);

router.get(
  "/students/:studentId/attendance",
  validation(studentIdSchema),
  verifyStudentBelongsToParent(),
  parentController.getStudentAttendance
);

router.get("/notifications", parentController.getParentNotifications);
export default router;
