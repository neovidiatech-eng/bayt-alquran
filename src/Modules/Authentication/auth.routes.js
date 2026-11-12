import { Router } from "express";
import * as auth from "./auth.controller.js";
import cookieParser from "cookie-parser";
import { validation } from "../../Middlewares/Validation.js";
import {
  forgetPasswordSchema,
  loginSchema,
  registeritonSchema,
  registerTeacherSchema,
  approveTeacherRequestSchema,
  rejectTeacherRequestSchema,
  getTeacherRequestsSchema,
  resendOtpSchema,
  resetPasswordSchema,
  saveFCM,
  verifiyCodeSchema,
} from "./auth.validation.js";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize, authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import { authRateLimiter, otpRateLimiter } from "../../Middlewares/RateLimiter.js";

const router = Router();

router.post("/sign-up", authRateLimiter, validation(registeritonSchema), auth.register);

router.post("/sign-up-teacher", authRateLimiter, validation(registerTeacherSchema), auth.registerTeacher);

router.post("/sign-in", authRateLimiter, validation(loginSchema), auth.login); //done

router.post("/refresh", cookieParser(), auth.refresh); //done

// router.post(
//   "/google-signup",
//   validation(googleSignupSchema),
//   auth.googleSignUp,
// );

// router.post("/google-login", validation(googleLoginSchema), auth.googlelogin); //done

router.post("/logout", cookieParser(), auth.logout); //done

router.post(
  "/verify-account",
  otpRateLimiter,
  validation(verifiyCodeSchema),
  auth.verifyAccount,
); //done

router.post("/resend-otp", otpRateLimiter, validation(resendOtpSchema), auth.resendOtp);
router.post(
  "/forget-password",
  otpRateLimiter,
  validation(forgetPasswordSchema),
  auth.forgetPassword,
);

router.patch(
  "/reset-password",
  otpRateLimiter,
  validation(resetPasswordSchema),
  auth.resetPassword,

);

router.get("/getLogs", authentication(), authorize(PERMISSIONS_V2.DASHBOARD.READ), auth.getLogs);
router.patch("/save-fcm", authentication(), validation(saveFCM), auth.saveFCM);

/* ── Teacher Signup Requests (Admin) ── */
router.get(
  "/teacher-requests",
  authentication(),
  authorize(PERMISSIONS_V2.TEACHERS.READ),
  validation(getTeacherRequestsSchema),
  auth.getTeacherRequests,
);

router.patch(
  "/teacher-requests/:userId/approve",
  authentication(),
  authorize(PERMISSIONS_V2.TEACHERS.CREATE),
  validation(approveTeacherRequestSchema),
  auth.approveTeacherRequest,
);

router.delete(
  "/teacher-requests/:userId/reject",
  authentication(),
  authorize(PERMISSIONS_V2.TEACHERS.DELETE),
  validation(rejectTeacherRequestSchema),
  auth.rejectTeacherRequest,
);

export default router;

