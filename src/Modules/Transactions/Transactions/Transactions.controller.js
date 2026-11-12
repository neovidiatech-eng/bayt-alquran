import dayjs from "dayjs";
import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../../Utils/Response.js";
import * as db from "../../../database/dbService.js";

export const getTransactions = asyncHandler(async (req, res, next) => {
  const {
    currencyId,
    page,
    limit,
    type,
    status,
    search,
    month_start,
    month_end,
  } = req.query;
let start = null;
let end = null;
  if (month_start && month_end) {
    start = month_start
      ? dayjs(month_start).startOf("month").toDate()
      : null;
    end = month_end ? dayjs(month_end).endOf("month").toDate() : null;
  }
  console.log({ start, end });

  // 1. Build filter
  const where = { deleted: false };
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { reason: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
    ];
  }
  if (start && end) {
    where.createdAt = { gte: start, lte: end };
  }

  // 2. Fetch transactions with pagination
  const { items: transactions, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "transaction",
      where,
      page,
      limit,
      include: {
        wallet: {
          include: {
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

  // 3. Fetch default currency
  const defaultCurrency = await db.findFirst({
    model: "currency",
    where: { default: true },
  });

  if (!defaultCurrency) {
    return errorResponse({
      req,
      next,
      message: "DEFAULT_CURRENCY_NOT_FOUND",
      status: 500,
    });
  }

  // 4. Fetch target currency
  let targetCurrency = defaultCurrency;
  if (currencyId) {
    const foundCurrency = await db.findFirst({
      model: "currency",
      where: { id: currencyId },
    });
    if (foundCurrency) {
      targetCurrency = foundCurrency;
    }
  }

  // 5. Convert transactions
  const convertedTransactions = transactions.map((transaction) => {
    const amount = transaction.amount;

    // Formula: convertedAmount = (amount / defaultCurrency.exchangeRate) * targetCurrency.exchangeRate
    const convertedAmount =
      (amount / defaultCurrency.exchangeRate) * targetCurrency.exchangeRate;

    return {
      id: transaction.id,
      walletId: transaction.walletId,
      type: transaction.type,
      status: transaction.status,
      reason: transaction.reason,
      createdAt: transaction.createdAt,
      originalAmount: amount, // default currency
      convertedAmount: Number(convertedAmount.toFixed(2)), // requested currency
      currencyCode: targetCurrency.code,
      exchangeRateUsed: targetCurrency.exchangeRate,
    };
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "TRANSACTIONS_FETCHED_SUCCESSFULLY",
    data: {
      transactions: convertedTransactions,
      pagination,
    },
  });
});

export const zeroing = asyncHandler(async (req, res, next) => {
  const month_start = dayjs().startOf("month").toDate();
  const month_end = dayjs().endOf("month").toDate();

  const flagedTodeleted = await db.updateMany({
    model: "transaction",
    where: {
      deleted: false,
      createdAt: {
        gte: month_start,

        lte: month_end,
      },
    },
    data: {
      deleted: true,
    },
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "TRANSACTIONS_FETCHED_SUCCESSFULLY",
    data: {
      month_start,
      month_end,
    },
  });
});

export const getTransactionStats = asyncHandler(async (req, res, next) => {
  const { currencyId, month_end, month_start } = req.query;
  let start = null;
  let end = null;
  if (month_start && month_end) {
    start = dayjs(month_start).startOf("month").toDate();
    end = dayjs(month_end).endOf("month").toDate();
  }

  // 1. Fetch default currency
  const defaultCurrency = await db.findFirst({
    model: "currency",
    where: { default: true },
  });

  if (!defaultCurrency) {
    return errorResponse({
      req,
      next,
      message: "DEFAULT_CURRENCY_NOT_FOUND",
      status: 500,
    });
  }

  // 2. Fetch target currency
  let targetCurrency = defaultCurrency;
  if (currencyId) {
    const foundCurrency = await db.findFirst({
      model: "currency",
      where: { id: currencyId },
    });
    if (foundCurrency) {
      targetCurrency = foundCurrency;
    }
  }

  // 3. Aggregate sums by type and status
  const stats = await db.groupBy({
    model: "transaction",
    by: ["type", "status"],
    _sum: { amount: true },
    _count: { id: true },
    where: {
      deleted: false,
      ...(start && end && { createdAt: { gte: start, lte: end } }),
    },
  });

  let totalRevenue = 0;
  let totalExpenses = 0;
  let completedCount = 0;
  let pendingCount = 0;

  stats.forEach((s) => {
    if (s.status === "completed") {
      completedCount += s._count.id;
      // Revenue types
      if (["subscription", "credit"].includes(s.type)) {
        totalRevenue += s._sum.amount || 0;
      }
      // Expense types
      else if (["expense", "debit", "withdrawal"].includes(s.type)) {
        totalExpenses += s._sum.amount || 0;
      }
    } else if (s.status === "pending") {
      pendingCount += s._count.id;
    }
  });

  const netProfit = totalRevenue - totalExpenses;

  // 4. Helper for conversion
  const convert = (val) =>
    Number(
      (
        (val / defaultCurrency.exchangeRate) *
        targetCurrency.exchangeRate
      ).toFixed(2),
    );

  return successResponse({
    res,
    req,
    status: 200,
    message: "STATS_FETCHED_SUCCESSFULLY",
    data: {
      totalRevenue: convert(totalRevenue),
      totalExpenses: convert(totalExpenses),
      netProfit: convert(netProfit),
      completedTransactions: completedCount,
      pendingTransactions: pendingCount,
      currencyCode: targetCurrency.code,
    },
  });
});
