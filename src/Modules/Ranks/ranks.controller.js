import * as db from "../../database/dbService.js";
import { asyncHandler, errorResponse, successResponse } from "../../Utils/Response.js";

// GET /ranks
export const getAllRanks = asyncHandler(async (req, res, next) => {
  const { active } = req.query;
  const where = {};

  if (active !== undefined) {
    where.active = active === "true" || active === true;
  }

  const ranks = await db.findMany({
    model: "Rank",
    where,
    orderBy: { minSessions: "asc" },
    include: {
      _count: {
        select: { students: true },
      },
    },
  });

  return successResponse({
    res,
    status: 200,
    message: req.t("RANKS_FETCHED_SUCCESS"),
    data: { ranks },
  });
});

// GET /ranks/:id
export const getRankById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rank = await db.findOne({
    model: "Rank",
    where: { id },
    include: {
      _count: {
        select: { students: true },
      },
    },
  });

  if (!rank) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "RANK_NOT_FOUND",
    });
  }

  return successResponse({
    res,
    status: 200,
    message: req.t("RANK_FETCHED_SUCCESS"),
    data: { rank },
  });
});

// POST /ranks
export const createRank = asyncHandler(async (req, res, next) => {
  const {
    name_ar,
    name_en,
    description_ar,
    description_en,
    color,
    icon,
    minSessions,
    minPoints,
    active,
  } = req.body;

  const existing = await db.findFirst({
    model: "Rank",
    where: {
      OR: [{ name_ar }, { name_en }],
    },
  });

  if (existing) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "RANK_NAME_EXISTS",
    });
  }

  const rank = await db.create({
    model: "Rank",
    data: {
      name_ar,
      name_en,
      description_ar,
      description_en,
      color,
      icon,
      minSessions,
      minPoints,
      active,
    },
  });

  return successResponse({
    res,
    status: 201,
    message: req.t("RANK_CREATED_SUCCESS"),
    data: { rank },
  });
});

// PATCH /ranks/:id
export const updateRank = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rank = await db.findOne({
    model: "Rank",
    where: { id },
  });

  if (!rank) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "RANK_NOT_FOUND",
    });
  }

  if (req.body.name_ar || req.body.name_en) {
    const existing = await db.findFirst({
      model: "Rank",
      where: {
        id: { not: id },
        OR: [
          req.body.name_ar ? { name_ar: req.body.name_ar } : undefined,
          req.body.name_en ? { name_en: req.body.name_en } : undefined,
        ].filter(Boolean),
      },
    });

    if (existing) {
      return errorResponse({
        req,
        next,
        status: 400,
        message: "RANK_NAME_EXISTS",
      });
    }
  }

  const updatedRank = await db.updateOne({
    model: "Rank",
    where: { id },
    data: req.body,
  });

  return successResponse({
    res,
    status: 200,
    message: req.t("RANK_UPDATED_SUCCESS"),
    data: { rank: updatedRank },
  });
});

// DELETE /ranks/:id
export const deleteRank = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rank = await db.findOne({
    model: "Rank",
    where: { id },
  });

  if (!rank) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "RANK_NOT_FOUND",
    });
  }

  await db.deleteOne({
    model: "Rank",
    where: { id },
  });

  return successResponse({
    res,
    status: 200,
    message: req.t("RANK_DELETED_SUCCESS"),
  });
});

// PATCH /ranks/assign
export const assignStudentRank = asyncHandler(async (req, res, next) => {
  const { studentId, rankId } = req.body;

  const student = await db.findOne({
    model: "student",
    where: { id: studentId },
  });

  if (!student) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  if (rankId) {
    const rank = await db.findOne({
      model: "Rank",
      where: { id: rankId },
    });

    if (!rank) {
      return errorResponse({
        req,
        next,
        status: 404,
        message: "RANK_NOT_FOUND",
      });
    }
  }

  const updatedStudent = await db.updateOne({
    model: "student",
    where: { id: studentId },
    data: { rankId },
    include: { rank: true },
  });

  return successResponse({
    res,
    status: 200,
    message: req.t("STUDENT_RANK_ASSIGNED_SUCCESS"),
    data: { student: updatedStudent },
  });
});
