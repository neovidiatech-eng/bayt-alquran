import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../../Utils/Response.js";
import * as db from "../../../database/dbService.js";

export const getAllPlans = asyncHandler(async (req, res, next) => {
  const allPlans = await db.findMany({
    model: "Plans",
    include: {
      currency: {
        select: {
          id: true,
          name_en: true,
          name_ar: true,
          symbol: true,
          code: true,
        },
      },
    },
  });
  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    status: 200,
    data: allPlans,
  });
});
export const createPlan = asyncHandler(async (req, res, next) => {
  const {
    name_en,
    name_ar,
    price,
    duration,
    sessionsCount,
    description,
    active,
    bestSeller,
    features,
    sessionTime,
    currencyId,
  } = req.body;
  const existPlan = await db.findFirst({
    model: "Plans",
    where: {
      OR: [{ name_en }, { name_ar }],
    },
  });
  const existCurrency = await db.findFirst({
    model: "currency",
    where: {
      id: currencyId,
    },
  });
  if (!existCurrency) {
    return errorResponse({
      next,
      req,
      message: "CURRENCY_NOT_FOUND",
      status: 404,
    });
  }

  if (existPlan) {
    return errorResponse({
      next,
      req,
      message: "PLAN_ALREADY_EXISTS",
      status: 400,
    });
  }
  const plan = await db.create({
    model: "Plans",
    data: {
      name_en,
      name_ar,
      price: String(price),
      duration,
      sessionsCount,
      description,
      active: active || false,
      bestSeller: bestSeller || false,
      features,
      sessionTime: parseInt(sessionTime),
      currencyId,
    },
  });
  if (!plan) {
    return errorResponse({
      next,
      req,
      message: "CREATE_FAILED",
      status: 400,
    });
  }
  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    status: 200,
    data: plan,
  });
});

export const updatePlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const {
    name_en,
    name_ar,
    price,
    duration,
    sessionsCount,
    description,
    active,
    bestSeller,
    features,
    sessionTime,
    currencyId,
  } = req.body;

  const plan = await db.findOne({
    model: "Plans",
    where: { id },
  });

  if (!plan) {
    return errorResponse({
      next,
      req,
      message: "PLAN_NOT_FOUND",
      status: 404,
    });
  }


  // تجهيز البيانات للتحديث (فقط الحقول المرسلة)
  const data = {};

  if (name_en !== undefined) data.name_en = name_en;
  if (name_ar !== undefined) data.name_ar = name_ar;
  if (description !== undefined) data.description = description;
  if (price !== undefined) data.price = String(price);
  if (duration !== undefined) data.duration = duration;
  if (sessionsCount !== undefined) data.sessionsCount = sessionsCount;
  if (active !== undefined) data.active = active;
  if (bestSeller !== undefined) data.bestSeller = bestSeller;
  if (features !== undefined) data.features = features;
  if (sessionTime !== undefined) data.sessionTime = sessionTime;
  if (currencyId !== undefined) data.currencyId = currencyId;

  const updatedPlan = await db.updateOne({
    model: "Plans",
    where: { id },
    data,
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    status: 200,
    data: updatedPlan,
  });
});

export const deletePlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const plan = await db.findOne({
    model: "Plans",
    where: { id },
  });

  if (!plan) {
    return errorResponse({
      next,
      req,
      message: "PLAN_NOT_FOUND",
      status: 404,
    });
  }

  await db.deleteOne({
    model: "Plans",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
  });
});
