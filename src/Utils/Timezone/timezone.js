import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "Africa/Cairo";

let geoipLite = null;
try {
  const mod = await import("geoip-lite");
  geoipLite = mod.default || mod;
} catch {
  geoipLite = null;
}

const LOCAL_IPS = new Set(["127.0.0.1", "::1", "localhost", "0.0.0.0"]);
const OFFSET_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const cleanIp = (ip) => {
  if (!ip || typeof ip !== "string") return "";
  return ip.trim().replace(/^::ffff:/i, "");
};

const isLocalIp = (ip) => {
  const normalized = cleanIp(ip);
  return (
    LOCAL_IPS.has(normalized) ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("172.16.") ||
    normalized.startsWith("172.17.") ||
    normalized.startsWith("172.18.") ||
    normalized.startsWith("172.19.") ||
    normalized.startsWith("172.2") ||
    normalized.startsWith("169.254.")
  );
};

export const getClientIp = (req) => {
  const headers = req?.headers || {};
  const candidates = [
    headers["cf-connecting-ip"],
    headers["x-real-ip"],
    headers["x-forwarded-for"]?.split(",")?.[0],
    req?.socket?.remoteAddress,
    req?.ip,
  ];

  for (const candidate of candidates) {
    const ip = cleanIp(candidate);
    if (ip) return ip;
  }

  return "";
};

export const getTimezoneFromIp = (req) => {
  const clientIp = getClientIp(req);
  if (!clientIp || isLocalIp(clientIp)) {
    return {
      clientIp,
      geo: null,
      timezone: DEFAULT_TIMEZONE,
      request_country: null,
    };
  }

  const geo = geoipLite?.lookup?.(clientIp) || null;
  return {
    clientIp,
    geo,
    timezone: geo?.timezone || DEFAULT_TIMEZONE,
    request_country: geo?.country || null,
  };
};

export const resolveRequestTimezone = (req) => {
  const resolved = getTimezoneFromIp(req);
  req.clientIp = resolved.clientIp;
  req.geo = resolved.geo;
  req.timezone = resolved.timezone || DEFAULT_TIMEZONE;
  req.request_country = resolved.request_country;
  return req.timezone;
};

export const normalizeDateTimeForTimezone = (date, timezoneName = DEFAULT_TIMEZONE) => {
  if (!date) return null;

  if (dayjs.isDayjs(date)) {
    return date.utc().toDate();
  }

  if (date instanceof Date) {
    return dayjs(date).utc().toDate();
  }

  if (typeof date === "string") {
    const value = date.trim();
    const parsed = OFFSET_RE.test(value)
      ? dayjs.utc(value)
      : dayjs.tz(value, timezoneName || DEFAULT_TIMEZONE);

    return parsed.isValid() ? parsed.utc().toDate() : null;
  }

  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.utc().toDate() : null;
};

export const formatDateTimeForTimezone = (
  date,
  timezoneName = DEFAULT_TIMEZONE,
  format = "YYYY-MM-DD hh:mm A",
) => {
  if (!date) return "";
  const parsed = dayjs.utc(date);
  if (!parsed.isValid()) return "";
  return parsed.tz(timezoneName || DEFAULT_TIMEZONE).format(format);
};

export const formatSessionForTimezone = (session, timezoneName = DEFAULT_TIMEZONE) => {
  if (!session || typeof session !== "object") return session;

  return {
    ...session,
    display_start_time: formatDateTimeForTimezone(session.start_time, timezoneName),
    display_end_time: formatDateTimeForTimezone(session.end_time, timezoneName),
    display_timezone: timezoneName || DEFAULT_TIMEZONE,
  };
};

export const formatSessionsForTimezone = (sessions, timezoneName = DEFAULT_TIMEZONE) => {
  if (Array.isArray(sessions)) {
    return sessions.map((session) => formatSessionForTimezone(session, timezoneName));
  }

  return formatSessionForTimezone(sessions, timezoneName);
};
