import { asyncHandler, successResponse } from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";

/**
 * Reads settings from database
 * @returns {Promise<{lateDiscountRules: Array<{lateMinutes: number, discountPercentage: number}>}>}
 */
export const getSettingsData = async () => {
  try {
    const setting = await db.findFirst({ model: "Setting" });
    if (setting && setting.discounts) {
      const data = typeof setting.discounts === "string"
        ? JSON.parse(setting.discounts)
        : setting.discounts;
      return data;
    }
    return {
      lateDiscountRules: [
        { lateMinutes: 10, discountPercentage: 5 },
      ],
    };
  } catch (error) {
    console.error("Error reading settings from DB:", error);
    return {
      lateDiscountRules: [
        { lateMinutes: 10, discountPercentage: 5 },
      ],
    };
  }
};

/**
 * Writes settings to database
 * @param {Record<string, any>} discounts
 * @returns {Promise<void>}
 */
export const saveSettingsData = async (discounts) => {
  const existing = await db.findFirst({ model: "Setting" });
  if (existing) {
    await db.updateOne({
      model: "Setting",
      where: { id: existing.id },
      data: { discounts },
    });
  } else {
    await db.create({
      model: "Setting",
      data: { discounts },
    });
  }
};

export const getLateDiscount = asyncHandler(async (req, res, next) => {
  const settings = await getSettingsData();
  return successResponse({
    res,
    req,
    status: 200,
    data: settings,
    message: "FETCH_SUCCESS",
  });
});


export const updateLateDiscount = asyncHandler(async (req, res, next) => {
  const { lateMinutes, discountPercentage } = req.body;

  if (
    lateMinutes === undefined ||
    discountPercentage === undefined
  ) {
    return next(new Error("lateMinutes and discountPercentage are required"));
  }

  const settings = await getSettingsData();

  const currentRules = settings.lateDiscountRules || [];

  const existingRuleIndex = currentRules.findIndex(
    (rule) => Number(rule.lateMinutes) === Number(lateMinutes)
  );

  if (existingRuleIndex !== -1) {
    // update existing rule
    currentRules[existingRuleIndex].discountPercentage =
      Number(discountPercentage);
  } else {
    // add new rule
    currentRules.push({
      lateMinutes: Number(lateMinutes),
      discountPercentage: Number(discountPercentage),
    });
  }

  await saveSettingsData({
    lateDiscountRules: currentRules,
  });

  const updatedSettings = await getSettingsData();

  return successResponse({
    res,
    req,
    status: 200,
    data: updatedSettings,
    message: "UPDATE_SUCCESS",
  });
});