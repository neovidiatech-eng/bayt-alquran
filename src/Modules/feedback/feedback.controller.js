import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { decryptText, looksEncrypted } from "../../Utils/Security/index.js";

export const getFeedbacks = asyncHandler(async (req, res, next) => {
  const { page, limit, search } = req.query;
  const where = {};

  if (search) {
    where.OR = [
      {
        reviewee: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
      {
        reviewer: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const feedback = await db.findManyWithPaginationAndCount({
    model: "review",
    page,
    limit,
    where,
    include: {
      reviewer: { select: { id: true, name: true, email: true, phone: true } },
      reviewee: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  for (const f of feedback.items) {
    if (f.reviewer?.phone) {
      f.reviewer.phone = looksEncrypted(f.reviewer.phone)
        ? await decryptText({ text: f.reviewer.phone })
        : f.reviewer.phone;
    }
    if (f.reviewee?.phone) {
      f.reviewee.phone = looksEncrypted(f.reviewee.phone)
        ? await decryptText({ text: f.reviewee.phone })
        : f.reviewee.phone;
    }
  }

  return successResponse({
    res,
    req,
    data: feedback,
    message: "FEEDBACKS_RETRIEVED_SUCCESSFULLY",
    status: 200,
  });
});

export const getFeedback = asyncHandler(async (req, res, next) => {
  const { feedback_id } = req.params;

  const feedback = await db.findOne({
    model: "review",
    where: { id: feedback_id },
    include: {
      reviewer: { select: { id: true, name: true, email: true, phone: true } },
      reviewee: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!feedback) {
    return errorResponse({
      res,
      req,
      message: "FEEDBACK_NOT_FOUND",
      status: 404,
    });
  }

  if (feedback.reviewer?.phone) {
    feedback.reviewer.phone = looksEncrypted(feedback.reviewer.phone)
      ? await decryptText({ text: feedback.reviewer.phone })
      : feedback.reviewer.phone;
  }
  if (feedback.reviewee?.phone) {
    feedback.reviewee.phone = looksEncrypted(feedback.reviewee.phone)
      ? await decryptText({ text: feedback.reviewee.phone })
      : feedback.reviewee.phone;
  }

  return successResponse({
    res,
    req,
    data: feedback,
    message: "FEEDBACK_RETRIEVED_SUCCESSFULLY",
    status: 200,
  });
});
