import { resolveRequestTimezone } from "../Utils/Timezone/timezone.js";

export const timezoneMiddleware = (req, res, next) => {
  resolveRequestTimezone(req);
  next();
};
