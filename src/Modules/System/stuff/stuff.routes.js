import { Router } from "express";
import { validation } from "../../../Middlewares/Validation.js";
import { addParentSchema } from "./stuff.validation.js";
import * as stuffController from "./stuff.controller.js";
import { authentication } from "../../../Middlewares/Authentication.js";
import { authorizeResource } from "../../../Middlewares/AuthorizationMiddleware.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorizeResource("users"),
  stuffController.getAllStuff,
);
router.get(
  "/:id",
  authentication(),
  authorizeResource("users"),
  stuffController.getStuffById,
);
router.post(
  "/create",
  authentication(),
  authorizeResource("users"),
  stuffController.createStuffUser,
);
router.patch(
  "/update/:id",
  authentication(),
  authorizeResource("users"),
  stuffController.updateStuffUser,
);
router.delete(
  "/delete/:id",
  authentication(),
  authorizeResource("users"),
  stuffController.deleteStuffUser,
);

router.post("/create-parent", validation(addParentSchema), stuffController.registerParent);

export default router;
