import rateLimit from "express-rate-limit";

// Generic rate limiter for auth routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    message: "Too many attempts, please try again after 15 minutes",
    status: 429
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More strict limiter for OTP requests
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 OTP requests per hour
  message: {
    message: "Too many OTP requests, please try again after an hour",
    status: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
});
