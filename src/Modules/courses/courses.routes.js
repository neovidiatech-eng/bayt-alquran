import { Router } from "express";
import { authentication } from "../../Middlewares/Authentication.js";
import { validation } from "../../Middlewares/Validation.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import * as coursesController from "./courses.controller.js";
import * as schema from "./courses.validation.js";
import { localMulterUpload, fileValidation } from "../../Utils/Multer/local.multer.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorizeResource("courses"),
  localMulterUpload({
    customPath: (req) => {
      const courseName = req.body?.title || 'unnamed_course';
      return `courses/${courseName.replace(/\s+/g, '_')}`;
    },
    validation: fileValidation.image,
  }).single("image"),
  validation(schema.createCourse),
  coursesController.createCourse,
);

router.patch(
  "/:id",
  authentication(),
  authorizeResource("courses"),
  localMulterUpload({
    customPath: (req) => {
      const courseName = req.body?.title || 'unnamed_course';
      return `courses/${courseName.replace(/\s+/g, '_')}`;
    },
    validation: fileValidation.image,
  }).single("image"),
  validation(schema.updateCourse),
  coursesController.updateCourse,
);

router.delete(
  "/:id",
  authentication(),
  authorizeResource("courses"),
  validation(schema.deleteCourse),
  coursesController.deleteCourse,
);

router.get(
  "/",
  authentication(),
  authorizeResource("courses"),
  validation(schema.getAllCourse),
  coursesController.getAllCourse,
);

export default router;