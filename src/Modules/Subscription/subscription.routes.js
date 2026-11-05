import { Router } from "express";
import plansRouter from "./Plans/plans.routes.js";
import subscriptionsRequestsRouter from "./SubscriptionRequests/subscriptionRequests.routes.js";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import * as sub from "./subscription.controller.js";

const router = Router();
router.use("/plans", plansRouter);
router.use("/requests", subscriptionsRequestsRouter);
router.get(
  "/",
  authentication(),
  authorizeResource("subscriptions"),
  sub.getallSubscriptions,
);

export default router;
