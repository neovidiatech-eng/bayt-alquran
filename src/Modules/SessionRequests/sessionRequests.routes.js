import { Router } from "express";
import * as sessionRequestsController from "./sessionRequests.controller.js";
import * as sessionRequestsValidation from "./sessionRequests.validation.js";
import { validation } from "../../Middlewares/Validation.js";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorizeResource, authorize } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import { mutationRateLimiter } from "../../Middlewares/RateLimiter.js";

const router = Router();

// Create Request (POST -> create)
router.post(
  "/",
  authentication(),
  mutationRateLimiter,
  authorizeResource("requests"),
  validation(sessionRequestsValidation.createRequest),
  sessionRequestsController.createRequest,
);

// Admin: Get All (GET -> read)
router.get(
  "/all",
  authentication(),
  authorizeResource("requests"),
  sessionRequestsController.getAllRequests,
);

// User: Get My Requests (GET -> read)
router.get(
  "/my-requests",
  authentication(),
  authorizeResource("requests"),
  sessionRequestsController.getMyRequests,
);

// Admin: Approve (custom permission)
router.patch(
  "/:id/approve",
  authentication(),
  authorize(PERMISSIONS_V2.REQUESTS.HANDLE),
  validation(sessionRequestsValidation.handleRequest),
  sessionRequestsController.approveRequest,
);

// Admin: Reject (custom permission)
router.patch(
  "/:id/reject",
  authentication(),
  authorize(PERMISSIONS_V2.REQUESTS.REJECT),
  validation(sessionRequestsValidation.handleRequest),
  sessionRequestsController.rejectRequest,
);

export default router;
