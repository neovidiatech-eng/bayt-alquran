import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "Africa/Cairo";

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
  
  let result;
  // If it's already a dayjs object
  if (dayjs.isDayjs(date)) {
    result = date.utc();
  }
  // If it's a string and doesn't have a timezone offset or 'Z'
  else if (typeof date === "string" && !date.includes("Z") && !date.match(/[\+\-]\d{2}:?\d{2}$/)) {
    result = dayjs.tz(date, tz).utc();
    console.log(`[TIME_PARSE] Local string detected: "${date}" | Interpreted as ${tz} | Result (UTC): ${result.toISOString()}`);
  }
  else {
    result = dayjs.utc(date);
    console.log(`[TIME_PARSE] UTC/ISO string detected: "${date}" | Result (UTC): ${result.toISOString()}`);
  }

  return result.isValid() ? result : null;
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

  console.log(`[TIME_CHECK] Now (UTC): ${now.toISOString()} | Now (Cairo): ${toLocal(now)}`);
  console.log(`[TIME_CHECK] Session Start (UTC): ${start.toISOString()} | Allowed From (UTC): ${threshold.toISOString()}`);
  console.log(`[TIME_CHECK] Is Too Early: ${tooEarly}`);

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
  const formatSingle = (s) => ({
    ...s,
    start_time: toLocal(s.start_time, tz),
    end_time: toLocal(s.end_time, tz),
  });

  if (Array.isArray(schedules)) {
    return schedules.map(formatSingle);
  }
  return formatSingle(schedules);
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
