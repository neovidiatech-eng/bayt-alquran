import { DEFAULT_TIMEZONE } from "../Utils/Date/time.js";

/**
 * Middleware to detect the user's timezone and attach it to the request object.
 * Priority:
 * 1. User profile in req.user (if authenticated)
 * 2. X-Timezone header
 * 3. Fallback to "Africa/Cairo"
 */
export const timezoneMiddleware = (req, res, next) => {
  let tz = req.user?.timezone;

  if (!tz) {
    tz = req.headers["x-timezone"];
  }

  // Basic validation for timezone string (IANA format)
  // We can add a more robust check here if needed
  if (!tz || typeof tz !== "string") {
    tz = DEFAULT_TIMEZONE;
  }

  req.timezone = tz;
  next();
};
