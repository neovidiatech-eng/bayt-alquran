import {
  errorResponse,
  successResponse,
  asyncHandler,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";

/* ------------------------------------------------------------------ */
/*                  Teacher requests a withdrawal                     */
/* ------------------------------------------------------------------ */
export const requestWithdrawal = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;
  const teacherId = req.user.id;

  // 1. Get teacher wallet
  const wallet = await db.findFirst({
    model: "Wallet",
    where: { userId: teacherId, type: "teacher" },
  });

  if (!wallet) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "WALLET_NOT_FOUND",
    });
  }

  // 2. Check current balance
  if (wallet.balance < amount) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "INSUFFICIENT_BALANCE",
      messageParams: { available: wallet.balance, required: amount },
    });
  }

  // 3. Create request
  const request = await db.create({
    model: "WithdrawalRequest",
    data: {
      teacherId,
      amount,
      currencyId: wallet.currencyId,
      status: "pending",
    },
  });

  return successResponse({
    res,
    req,
    status: 201,
    message: "REQUEST_SUBMITTED",
    data: { request },
  });
});

export const getWithdrawals = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const wallet = await db.findFirst({
    model: "Wallet",
    where: { userId: teacherId, type: "teacher" },
  });
  if (!wallet) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "WALLET_NOT_FOUND",
    });
  }
  const withdrawals = await db.findMany({
    model: "WithdrawalRequest",
    where: { teacherId },
    include: {
      currency: true,
    },
  });
  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: { withdrawals },
  });
});

export const getAllWithdrawals = asyncHandler(async (req, res, next) => {
  const withdrawals = await db.findMany({
    model: "WithdrawalRequest",
    include: {
      teacher: true,
      currency: true,
    },
  });
  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: { withdrawals },
  });
});

/* ------------------------------------------------------------------ */
/*                  Admin approves a withdrawal                       */
/* ------------------------------------------------------------------ */
export const approveWithdrawal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  // 1. Find request
  const request = await db.findOne({
    model: "WithdrawalRequest",
    where: { id },
    include:{
      teacher:true,
      
    } 
  });


  
  if (!request) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "REQUEST_NOT_FOUND",
    });
  }

  if (request.status !== "pending") {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "REQUEST_ALREADY_PROCESSED",
    });
  }

  // 2. Atomic Transaction for Safety
  const result = await db.transaction(async (tx) => {
    // 2.a Re-check balance (Double check for race conditions)
    const wallet = await tx.findFirst({
      model: "Wallet",
      where: { userId: request.user_id, type: "teacher" },
    });

    if (!wallet || wallet.balance < request.amount) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // 2.b Deduct Balance
    await tx.updateOne({
      model: "Wallet",
      where: { id: wallet.id },
      data: { balance: { decrement: request.amount } },
    });

    // 2.c Create Payout Transaction (Ledger)
    const transaction = await tx.create({
      model: "Transaction",
      data: {
        walletId: wallet.id,
        type: "withdrawal",
        amount: request.amount,
        withdrawalRequestId: request.id,
        reason: req.t("WITHDRAWAL_PAYOUT_REASON", {
          id: request.teacher.name || request.teacher.email ||request.id,
        }),
        status: "completed",
      },
    });

    // 2.d Update Request Status
    const updatedRequest = await tx.updateOne({
      model: "WithdrawalRequest",
      where: { id: request.id },
      data: {
        status: "approved",
        adminNotes,
      },
    });

    return updatedRequest;
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "REQUEST_APPROVED",
    data: { request: result },
  });
});

/* ------------------------------------------------------------------ */
/*                  Admin rejects a withdrawal                        */
/* ------------------------------------------------------------------ */
export const rejectWithdrawal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  // 1. Find request
  const request = await db.findOne({
    model: "WithdrawalRequest",
    where: { id },
  });

  if (!request) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "REQUEST_NOT_FOUND",
    });
  }

  if (request.status !== "pending") {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "REQUEST_ALREADY_PROCESSED",
    });
  }

  // 2. Update Status
  const updatedRequest = await db.updateOne({
    model: "WithdrawalRequest",
    where: { id },
    data: {
      status: "rejected",
      adminNotes,
    },
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "REQUEST_REJECTED",
    data: { request: updatedRequest },
  });
});
