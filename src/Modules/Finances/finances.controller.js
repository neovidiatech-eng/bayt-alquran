import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { ensureExists } from "../../database/genericService.js";

export const getExpenses = asyncHandler(async (req, res, next) => {
  const {
    search,
    status,
    type,
    page = 1,
    limit = 10,
    currencyCode,
  } = req.query;

  let totalExpenses = 0;
  let where = {};

  if (search) {
    where.title = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  const { items: expenses, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "expenses",
      where,
      page,
      limit,
      include: { currency: true },
    });

  let targetCurrency = null;

  if (currencyCode) {
    targetCurrency = await db.findFirst({
      model: "currency",
      where: {
        code: currencyCode,
      },
    });

    if (!targetCurrency) {
      return next(new AppError("CURRENCY_NOT_FOUND", 404));
    }
  }

  const handledExpenses = expenses.map((expense) => {
    const amount = Number(expense.amount);

    let convertedAmount = amount;
    let exchangeRate = 1;

    if (!targetCurrency) {
      totalExpenses += amount;
    } else if (targetCurrency && expense.currency) {
      /**
       * مثال:
       * expense.currency.exchangeRate = سعر عملة المصروف مقابل العملة الأساسية
       * targetCurrency.exchangeRate = سعر العملة المطلوبة مقابل العملة الأساسية
       */
      exchangeRate =
        Number(targetCurrency.exchangeRate) /
        Number(expense.currency.exchangeRate);

      convertedAmount = amount * exchangeRate;

      totalExpenses += convertedAmount;
    }

    return {
      ...expense,
      originalAmount: amount,
      originalCurrency: expense.currency,
      convertedAmount,
      exchangeRate,
      convertedCurrency: targetCurrency || expense.currency,
    };
  });

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    status: 200,
    data: {
      totalExpenses,
      expenses: handledExpenses,
      pagination,
    },
  });
});

export const getExpenseById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const expense = await ensureExists({
    model: "expenses",
    where: { id },
    include: { currency: true },
    message: "EXPENSE_NOT_FOUND",
  });

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    status: 200,
    data: expense,
  });
});

export const createExpense = asyncHandler(async (req, res, next) => {
  const { title, currencyId, amount, payment_type, type, status, date } =
    req.body;

  const [currencyExists, systemWallet] = await Promise.all([
    db.findOne({ model: "currency", where: { id: currencyId } }),
    db.findFirst({ model: "Wallet", where: { type: "system" } }),
  ]);

  if (!currencyExists) {
    return errorResponse({ req, next, message: "CURRENCY_NOT_FOUND", status: 404 });
  }
  if (!systemWallet) {
    return errorResponse({ req, next, message: "SYSTEM_WALLET_NOT_FOUND", status: 500 });
  }

  const parsedAmount = parseFloat(amount);

  // 🔒 Prevent wallet balance from going negative
  if (systemWallet.balance < parsedAmount) {
    return errorResponse({
      req,
      next,
      message: "INSUFFICIENT_BALANCE",
      status: 400,
      details: {
        available: systemWallet.balance,
        required: parsedAmount,
      },
    });
  }

  let expense;
  await db.transaction(async (tx) => {
    // 1. Create expense record
    expense = await tx.create({
      model: "expenses",
      data: {
        title,
        currencyId,
        amount: parsedAmount,
        payment_type,
        type,
        status,
        date: new Date(date),
      },
    });

    // 2. Create debit ledger entry
    await tx.create({
      model: "Transaction",
      data: {
        walletId: systemWallet.id,
        type: "expense",
        amount: parsedAmount,
        status: "completed",
        reason: title,
        expenseId: expense.id,
      },
    });

    // 3. Deduct from system wallet balance
    await tx.updateOne({
      model: "Wallet",
      where: { id: systemWallet.id },
      data: { balance: { decrement: parsedAmount } },
    });
  });

  // Re-fetch with currency include after transaction
  const expenseWithCurrency = await db.findOne({
    model: "expenses",
    where: { id: expense.id },
    include: { currency: true },
  });

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    status: 201,
    data: expenseWithCurrency,
  });
});

export const updateExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, currencyId, amount, payment_type, type, status, date } =
    req.body;

  await ensureExists({
    model: "expenses",
    where: { id },
    message: "EXPENSE_NOT_FOUND",
  });

  if (currencyId) {
    const currencyExists = await db.findOne({
      model: "currency",
      where: { id: currencyId },
    });
    if (!currencyExists) {
      return errorResponse({
        req,
        next,
        message: "CURRENCY_NOT_FOUND",
        status: 404,
      });
    }
  }

  const updateData = {
    ...(title && { title }),
    ...(currencyId && { currencyId }),
    ...(amount !== undefined && { amount: parseFloat(amount) }),
    ...(payment_type && { payment_type }),
    ...(type && { type }),
    ...(status && { status }),
    ...(date && { date: new Date(date) }),
  };

  const expense = await db.updateOne({
    model: "expenses",
    where: { id },
    data: updateData,
    include: { currency: true },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    status: 200,
    data: expense,
  });
});

export const deleteExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  await ensureExists({
    model: "expenses",
    where: { id },
    message: "EXPENSE_NOT_FOUND",
  });

  await db.deleteOne({
    model: "expenses",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
  });
});
