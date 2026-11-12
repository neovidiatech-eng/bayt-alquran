import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Configure limits via environment variables with sensible defaults
const GLOBAL_LIMIT_WINDOW    = parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS)    || 15 * 60 * 1000;
const GLOBAL_LIMIT_MAX       = parseInt(process.env.GLOBAL_RATE_LIMIT_MAX)           || 100;

const AUTH_LIMIT_WINDOW      = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS)       || 15 * 60 * 1000;
const AUTH_LIMIT_MAX         = parseInt(process.env.AUTH_RATE_LIMIT_MAX)              || 20;

const OTP_LIMIT_WINDOW       = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS)        || 60 * 60 * 1000;
const OTP_LIMIT_MAX          = parseInt(process.env.OTP_RATE_LIMIT_MAX)               || 5;

const MUTATION_LIMIT_WINDOW  = parseInt(process.env.MUTATION_RATE_LIMIT_WINDOW_MS)   || 15 * 60 * 1000;
const MUTATION_LIMIT_MAX     = parseInt(process.env.MUTATION_RATE_LIMIT_MAX)          || 30;

const createRateLimiter = ({
  windowMs,
  limit,
  message,
  skipSuccessfulRequests = false,
  keyGenerator = (req) => ipKeyGenerator(req),
}) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    keyGenerator,
    requestPropertyName: "limits",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        status: 429,
        message: req.t(message),
      });
    },
  });

// Global rate limiter — DDoS / spam protection on every endpoint
export const globalRateLimiter = createRateLimiter({
  windowMs: GLOBAL_LIMIT_WINDOW,
  limit:    GLOBAL_LIMIT_MAX,
  message:  "TOO_MANY_ATTEMPTS_LIMIT_15M",
});

// Auth rate limiter — brute-force protection on sign-up / sign-in
export const authRateLimiter = createRateLimiter({
  windowMs:               AUTH_LIMIT_WINDOW,
  limit:                  AUTH_LIMIT_MAX,
  message:                "TOO_MANY_ATTEMPTS_LIMIT_15M",
  skipSuccessfulRequests: true, // only count failed attempts
});

// OTP rate limiter — keyed by email (falls back to IP)
export const otpRateLimiter = createRateLimiter({
  windowMs:     OTP_LIMIT_WINDOW,
  limit:        OTP_LIMIT_MAX,
  message:      "TOO_MANY_OTP_REQUESTS_1H",
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req),
});

// Mutation rate limiter — throttles sensitive write operations
// (withdrawals, session requests, subscriptions renewals, etc.)
export const mutationRateLimiter = createRateLimiter({
  windowMs: MUTATION_LIMIT_WINDOW,
  limit:    MUTATION_LIMIT_MAX,
  message:  "TOO_MANY_ATTEMPTS_LIMIT_15M",
});