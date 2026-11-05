import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../../Utils/Response.js";
import { decryptText } from "../../../Utils/Security/index.js";
import * as db from "../../../database/dbService.js";

export const getTeacherTransactions = asyncHandler(async (req, res, next) => {
  const teacher = await db.findOne({
    model: "teacher",
    where: { user_id: req.user.id },
    include: {
      user: true,
    },
  });

  if (!teacher) {
    return errorResponse({
      next,
      req,
      status: 404,
      message: "TEACHER_NOT_FOUND",
    });
  }

  const wallet = await db.findFirst({
    model: "Wallet",
    where: {
      ownerId: teacher.user.id,
      type: "teacher",
    },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
      currency: true,
    },
  });

  if (!wallet) {
    return errorResponse({
      next,
      req,
      status: 404,
      message: "WALLET_NOT_FOUND",
    });
  }

  const mapped = {
    balance: wallet.balance,
    currency: {
      code: wallet.currency.code,
      symbol: wallet.currency.symbol,
    },
    transactions: wallet.transactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      status: t.status,
      reason: t.reason,
      date: t.createdAt,
    })),
  };

  return successResponse({
    res,
    req,
    data: mapped,
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
