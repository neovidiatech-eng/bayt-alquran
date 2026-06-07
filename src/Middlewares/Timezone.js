import {
  getClientIp,
  getGeoFromRequest,
  resolveRequestTimezone,
} from "../Utils/Timezone/timezone.js";

/**
 * Middleware to detect the user's timezone from the request IP and attach it
 * to the request object. Falls back to Cairo for local/private/unknown IPs.
 */
export const timezoneMiddleware = (req, res, next) => {
  const geo = getGeoFromRequest(req);

  req.clientIp = getClientIp(req);
  req.geo = geo;
  req.timezone = resolveRequestTimezone(req);
  req.request_country = geo?.country || null;
  next();
};
