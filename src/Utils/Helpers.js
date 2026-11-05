import * as db from "../database/dbService.js";
import { errorResponse } from "./Response.js";
export const destructData = ({ body, allowed }) => {
  return Object.keys(body).reduce((acc, key) => {
    if (allowed.includes(key)) {
      acc[key] = body[key];
    }
    return acc;
  }, {});
};

export const checkExist = async ({ model, where, next }) => {
  const existing = await db.findOne({
    model,
    where,
  });

  if (!existing) {
    return errorResponse({
      next,
      status: 404,
      message: `${model} not found`,
    });
  }

  return existing;
};

export const checkConflict = async ({ model, where, next }) => {
  const existing = await db.findOne({
    model,
    where,
  });

  if (existing) {
    return errorResponse({
      next,
      status: 400,
      message: `${model} already exists`,
    });
  }

  return existing;
};

import { standardizeDate, toUTC, getDatesBetweenUTC, combineDateAndTime, formatSchedules } from "./Date/time.js";

export const getEndTime = ({startTime, duration = 0, tz}) => {
  const start = toUTC(startTime, tz);
  if (!start) return null;

  let end;
  if (duration > 0) {
    end = start.add(duration, "minute");
  }

  return end.toDate();
};

export const normalizeDate = (date, tz) => {
  return standardizeDate(date, tz);
};

export { getDatesBetweenUTC, combineDateAndTime, formatSchedules };
