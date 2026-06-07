import geoip from "geoip-lite";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "Africa/Cairo";
const LOCAL_IPS = new Set(["127.0.0.1", "::1", "localhost", ""]);

export const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  const ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    (Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")[0]?.trim()) ||
    req.socket?.remoteAddress ||
    req.ip;

  return String(ip || "")
    .replace("::ffff:", "")
    .trim();
};

export const getGeoFromRequest = (req) => {
  const ip = getClientIp(req);

  if (LOCAL_IPS.has(ip)) {
    return null;
  }

  return geoip.lookup(ip);
};

export const getTimezoneFromIp = (req) => {
  const geo = getGeoFromRequest(req);
  return geo?.timezone || null;
};

export const resolveRequestTimezone = (req) => {
  return getTimezoneFromIp(req) || DEFAULT_TIMEZONE;
};

export const formatDateTimeForTimezone = (
  date,
  tz = DEFAULT_TIMEZONE,
  format = "YYYY-MM-DD hh:mm A",
) => {
  if (!date) return null;
  const parsedDate = dayjs.utc(date);

  if (!parsedDate.isValid()) {
    return null;
  }

  return parsedDate.tz(tz).format(format);
};

export const getRequestTimezoneMetadata = (req) => {
  const geo = getGeoFromRequest(req);

  return {
    request_country: geo?.country || null,
    request_timezone: req.timezone || resolveRequestTimezone(req),
  };
};

export const addDisplayTimesToSchedule = (
  schedule,
  tz = DEFAULT_TIMEZONE,
  requestCountry = null,
) => {
  if (!schedule) return schedule;

  return {
    ...schedule,
    display_start_time: formatDateTimeForTimezone(schedule.start_time, tz),
    display_end_time: formatDateTimeForTimezone(schedule.end_time, tz),
    display_timezone: tz,
    ...(requestCountry && { request_country: requestCountry }),
  };
};
