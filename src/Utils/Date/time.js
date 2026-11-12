import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import {
  DEFAULT_TIMEZONE,
  formatDateTimeForTimezone,
  formatSessionsForTimezone,
  normalizeDateTimeForTimezone,
} from "../Timezone/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Get the current time in UTC
 * @returns {dayjs.Dayjs}
 */
export const getNowUTC = () => dayjs.utc();

/**
 * Convert any date input to a UTC dayjs object.
 * If a string is provided without timezone info, it's assumed to be in the provided timezone (default Cairo).
 * @param {string|Date} date 
 * @param {string} tz - The timezone to assume if none is provided
 * @returns {dayjs.Dayjs}
 */
export const toUTC = (date, tz = DEFAULT_TIMEZONE) => {
  if (!date) return null;

  const result = normalizeDateTimeForTimezone(date, tz);
  return result ? dayjs.utc(result) : null;
};

/**
 * Convert a UTC date to a specific local timezone string for display.
 * @param {Date|string|dayjs.Dayjs} date 
 * @param {string} tz - Target timezone (e.g. "Africa/Cairo")
 * @param {string} format 
 * @returns {string}
 */
export const toLocal = (date, tz = DEFAULT_TIMEZONE, format = "YYYY-MM-DD HH:mm:ss") => {
  if (!date) return "";
  return dayjs.utc(date).tz(tz).format(format);
};

/**
 * Standardize date for DB storage (sets seconds/ms to 0)
 * @param {string|Date} date 
 * @param {string} tz 
 * @returns {Date}
 */
export const standardizeDate = (date, tz = DEFAULT_TIMEZONE) => {
  const d = toUTC(date, tz);
  if (!d) return null;
  return d.second(0).millisecond(0).toDate();
};

/**
 * Check if the current time is before the allowed join window.
 * Window starts 'windowMinutes' before startTime.
 * @param {Date} startTime 
 * @param {number} windowMinutes 
 * @returns {boolean}
 */
export const isBeforeAllowedJoinTime = (startTime, windowMinutes = 5) => {
  const now = getNowUTC();
  const start = dayjs.utc(startTime);
  const threshold = start.subtract(windowMinutes, "minute");

  const tooEarly = now.isBefore(threshold);

  return tooEarly;
};

/**
 * Main window check: after threshold and before end.
 * @param {Date} startTime 
 * @param {Date} endTime 
 * @param {number} windowMinutes 
 * @returns {boolean}
 */
export const isInsideJoinWindow = (startTime, endTime, windowMinutes = 5) => {
  const now = getNowUTC();
  const start = dayjs.utc(startTime);
  const end = dayjs.utc(endTime);
  const threshold = start.subtract(windowMinutes, "minute");
  
  const isAfterThreshold = now.isAfter(threshold) || now.isSame(threshold);
  const isBeforeEnd = now.isBefore(end);

  return isAfterThreshold && isBeforeEnd;
};

/**
 * Format a schedule object or list of schedules into local timezone.
 * @param {Object|Array} schedules - Single schedule object or array of objects
 * @param {string} tz - Target timezone
 */
export const formatSchedules = (schedules, tz) => {
  return formatSessionsForTimezone(schedules, tz);
};

/**
 * Combine a date and a time string into a UTC Date object, assuming a specific timezone.
 * @param {Date|string} date 
 * @param {string} timeStr - "HH:mm"
 * @param {string} tz 
 * @returns {Date}
 */
export const combineDateAndTime = (date, timeStr, tz = DEFAULT_TIMEZONE) => {
  if (!date || !timeStr) return null;
  
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = dayjs.tz(date, tz)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0);
    
  return d.utc().toDate();
};

/**
 * Get all dates between start and end that match specific days (UTC-safe)
 * @param {string|Date} startDate 
 * @param {string|Date} endDate - Optional if count is provided
 * @param {string[]} days - ["Monday", "Tuesday"]
 * @param {number} count - Optional limit on number of dates
 * @returns {Date[]}
 */
export const getDatesBetweenUTC = (startDate, endDate, days, count) => {
  const dates = [];
  let curr = dayjs.utc(startDate).startOf("day");
  const end = endDate ? dayjs.utc(endDate).startOf("day") : null;

  const dayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDays = days.map((d) => dayMap[d.toLowerCase()]);

  // Safety limits: max 1000 sessions or 5 years in future
  const maxIterations = 2000; // ~5 years of daily checks
  const maxSessions = count || 1000;
  let iterations = 0;

  while (iterations < maxIterations) {
    if (targetDays.includes(curr.day())) {
      dates.push(curr.toDate());
    }
    
    if (count && dates.length >= count) break;
    if (end && (curr.isAfter(end) || curr.isSame(end))) break;
    if (!end && !count) break; // Should not happen with validation

    curr = curr.add(1, "day");
    iterations++;
  }
  
  return dates;
};
