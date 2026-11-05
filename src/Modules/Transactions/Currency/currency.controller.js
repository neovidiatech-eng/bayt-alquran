import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../../Utils/Response.js";
import * as db from "../../../database/dbService.js";

export const getCurrencies = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
 const [count, defaultCur] = await Promise.all([
  db.count({ model: "currency" }),
  db.findFirst({
    model: "currency",
    where: { default: true },
  }),
]);
  if (search) {
    const currencies = await db.findMany({
      model: "currency",
      where: {
        OR: [
          { name_en: { contains: search } },
          { name_ar: { contains: search } },
          { symbol: { contains: search } },
          { code: { contains: search } },
        ],
      },
    });
    return successResponse({
      res,
      req,
      message: "FETCH_SUCCESS",
      status: 200,
      data: {
        count: count,
        default: defaultCur,
        currencies,
      },
    });
  }
  const currencies = await db.findMany({
    model: "currency",
  });
  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    status: 200,
    data: {
      count: count,
      default: defaultCur,
      currencies,
    },
  });
});
export const getCurrencyById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return errorResponse({
      req,
      next,
      message: "CURRENCY_NOT_FOUND",
      status: 404,
    });
  }
  const currency = await db.findOne({ model: "currency", where: { id } });


  if (!currency) {
    return errorResponse({
      req,
      next,
      message: "CURRENCY_NOT_FOUND",
      status: 404,
    });
  }
  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    status: 200,
    data: currency,
  });
});
export const addCurrency = asyncHandler(async (req, res, next) => {
  const {
    name_en,
    name_ar,
    symbol,
    code,
    exchangeRate,
    default: isDefault,
  } = req.body;


  const codeExists = await db.findFirst({
    model: "currency",
    where: {
      code: code,
    },
  });
  if (codeExists) {
    return errorResponse({
      req,
      next,
      message: "CURRENCY_CODE_EXISTS",
      status: 400,
    });
  }
  const currency = await db.create({
    model: "currency",
    data: {
      name_en,
      name_ar,
      symbol,
      code,
      exchangeRate,
      default: isDefault,
    },
  });

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    status: 200,
    data: currency,
  });
});

export const updateCurrency = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name_en,
    name_ar,
    symbol,
    code,
    exchangeRate,
    default: isDefault,
  } = req.body;

  const currencyExists = await db.findFirst({
    model: "currency",
    where: { id },
  });

  if (!currencyExists) {
    return errorResponse({
      req,
      next,
      message: "CURRENCY_NOT_FOUND",
      status: 404,
    });
  }

  if (code) {
    const codeExists = await db.findFirst({
      model: "currency",
      where: {
        code: code,
        NOT: { id },
      },
    });
    if (codeExists) {
      return errorResponse({
        req,
        next,
        message: "CURRENCY_CODE_EXISTS",
        status: 400,
      });
    }
  }

  const updatedCurrency = await db.updateOne({
    model: "currency",
    where: { id },
    data: {
      name_en,
      name_ar,
      symbol,
      code,
      exchangeRate,
      default: isDefault,
    },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    status: 200,
    data: updatedCurrency,
  });
});
export const deleteCurrency = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const existsCurrency = await db.findFirst({
    model: "currency",
    where: { id },
  });
  if (!existsCurrency) {
    return errorResponse({
      req,
      next,
      message: "CURRENCY_NOT_FOUND",
      status: 404,
    });
  }
  const deleted = await db.deleteOne({ model: "currency", where: { id } });
  if (!deleted) {
    return errorResponse({
      req,
      next,
      message: "DELETE_FAILED",
      status: 400,
    });
  }
  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
    data: deleted,
  });
});
