import { asyncHandler, successResponse } from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";

/**
 * Reads settings from database
 */
export const getSettingsData = async () => {
  try {
    const setting = await db.findFirst({ model: "Setting" });
    if (setting) {
      return {
        ...setting,
        paidSessionCount: setting.paidSessionCount ?? 3,
        studentCanJoin: setting.studentCanJoin ?? false,
      };
    }
    return {
      paidSessionCount: 3,
      studentCanJoin: false,
    };
  } catch (error) {
    console.error("Error reading settings from DB:", error);
    return {
      paidSessionCount: 3,
      studentCanJoin: false,
    };
  }
};

/**
 * Writes settings to database
 * @param {Record<string, any>} data
 * @returns {Promise<void>}
 */
export const saveSettingsData = async (data) => {  
  const existing = await db.findFirst({ model: "Setting" });
  if (existing) {
    return await db.updateOne({
      model: "Setting",
      where: { id: existing.id },
      data: { ...data },
    });
  } else {
    return await db.create({
      model: "Setting",
      data: { ...data },
    });
  }
};

export const getSettings = asyncHandler(async (req, res, next) => {
  const settings = await getSettingsData();
  return successResponse({
    res,
    req,
    status: 200,
    data: settings,
    message: "FETCH_SUCCESS",
  });
});

export const updateSettings = asyncHandler(async (req, res, next) => {
  const { paidSessionCount, studentCanJoin } = req.body;

  const updatePayload = {};
  if (paidSessionCount !== undefined) updatePayload.paidSessionCount = parseInt(paidSessionCount);
  if (studentCanJoin !== undefined) updatePayload.studentCanJoin = studentCanJoin;

  await saveSettingsData(updatePayload);

  const updatedSettings = await getSettingsData();

  return successResponse({
    res,
    req,
    status: 200,
    data: updatedSettings,
    message: "UPDATE_SUCCESS",
  });
});