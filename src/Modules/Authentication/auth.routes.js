import { Router } from "express";
import * as auth from "./auth.controller.js";
import cookieParser from "cookie-parser";
import { validation } from "../../Middlewares/Validation.js";
import {
  forgetPasswordSchema,
  googleLoginSchema,
  googleSignupSchema,
  loginSchema,
  registeritonSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifiyCodeSchema,
} from "./auth.validation.js";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorize, authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";
import { PERMISSIONS_V2 } from "../../Constants/permissions.constants.js";
import { authRateLimiter, otpRateLimiter } from "../../Middlewares/RateLimiter.js";
const router = Router();

// ── Auth rate-limited routes (20 req / 15 min per IP) ────────────────────────
router.post("/sign-up",      authRateLimiter, validation(registeritonSchema), auth.register);
router.post("/sign-in",      authRateLimiter, validation(loginSchema),        auth.login);
router.post("/google-signup",authRateLimiter, validation(googleSignupSchema),  auth.googleSignUp);
router.post("/google-login", authRateLimiter, validation(googleLoginSchema),   auth.googlelogin);

// ── Unauthenticated session management ───────────────────────────────────────
router.post("/refresh", cookieParser(), auth.refresh);
router.post("/logout",  cookieParser(), auth.logout);

// ── OTP / password routes (5 req / 1 hr per IP) ──────────────────────────────
router.post("/verify-account",  otpRateLimiter, validation(verifiyCodeSchema),    auth.verifyAccount);
router.post("/resend-otp",      otpRateLimiter, validation(resendOtpSchema),      auth.resendOtp);
router.post("/forget-password", otpRateLimiter, validation(forgetPasswordSchema), auth.forgetPassword);
router.patch("/reset-password", otpRateLimiter, validation(resetPasswordSchema),  auth.resetPassword);

router.get("/getLogs",authentication(),authorize(PERMISSIONS_V2.DASHBOARD.READ), auth.getLogs);

export default router;
