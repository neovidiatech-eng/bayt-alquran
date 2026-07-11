import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../Utils/Radis/Connection.js";

// ─── Config from env (with sensible defaults) ────────────────────────────────

const GLOBAL_WINDOW_MS = parseInt(process.env.RL_GLOBAL_WINDOW_MS ?? "60000",   10); // 1 min
const GLOBAL_MAX       = parseInt(process.env.RL_GLOBAL_MAX       ?? "300",     10); // 300 req/min

const AUTH_WINDOW_MS   = parseInt(process.env.RL_AUTH_WINDOW_MS   ?? "900000",  10); // 15 min
const AUTH_MAX         = parseInt(process.env.RL_AUTH_MAX         ?? "20",      10); // 20 req/15 min

const OTP_WINDOW_MS    = parseInt(process.env.RL_OTP_WINDOW_MS    ?? "3600000", 10); // 1 hr
const OTP_MAX          = parseInt(process.env.RL_OTP_MAX          ?? "5",       10); // 5 req/hr

// ─── Internal limiter instances (populated after Redis connects) ──────────────

let _global, _auth, _otp;

const makeStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });

/**
 * Must be called once after `redisConnection()` resolves in app.controller.js.
 * Creates the actual rateLimit instances with a live Redis store.
 */
export const initRateLimiters = () => {
  _global = rateLimit({
    windowMs: GLOBAL_WINDOW_MS,
    limit: GLOBAL_MAX,
    store: makeStore("global"),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) =>
      res.status(429).json({
        message: req.t ? req.t("GLOBAL_RATE_LIMIT_EXCEEDED") : "Too many requests, please try again later.",
        status: 429,
      }),
  });

  _auth = rateLimit({
    windowMs: AUTH_WINDOW_MS,
    limit: AUTH_MAX,
    store: makeStore("auth"),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        message: req.t ? req.t("AUTH_RATE_LIMIT_EXCEEDED") : "Too many auth attempts, please try again later.",
        status: 429,
      }),
  });

  _otp = rateLimit({
    windowMs: OTP_WINDOW_MS,
    limit: OTP_MAX,
    store: makeStore("otp"),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        message: req.t ? req.t("OTP_RATE_LIMIT_EXCEEDED") : "Too many OTP requests, please try again in an hour.",
        status: 429,
      }),
  });
};

// ─── Lazy wrappers — safe to import at module load time ──────────────────────
// The actual limiter is only invoked on the first request, by which point
// initRateLimiters() will have already been called.

export const globalRateLimiter = (req, res, next) => _global(req, res, next);
export const authRateLimiter   = (req, res, next) => _auth(req, res, next);
export const otpRateLimiter    = (req, res, next) => _otp(req, res, next);
