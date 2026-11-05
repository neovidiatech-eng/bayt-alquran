import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../../Utils/Response.js";
import * as db from "../../../database/dbService.js";

export const getSubjects = asyncHandler(async (req, res, next) => {
  const { search, active } = req.query;

  let where = {};

  if (search) {
    where.OR = [
      { name_en: { contains: search } },
      { name_ar: { contains: search } },
    ];
  }

  if (active !== undefined) {
    where.active = active === "true";
  }

  const [count, activeCount] = await Promise.all([
    db.count({ model: "subjects" }),
    db.count({ model: "subjects", where: { active: true } }),
  ]);


  const subjects = await db.findMany({
    model: "subjects",
    where,
  });

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    status: 200,
    data: {
      count,
      activeCount,
      subjects,
    },
  });
});
export const createSubject = asyncHandler(async (req, res, next) => {
  const { name_en, name_ar, active, color } = req.body;

  const existsSubject = await db.findOne({
    model: "subjects",
    where: {
      name_en,
      name_ar,
    },
  });

  if (existsSubject) {
    return errorResponse({
      req,
      next,
      message: "SUBJECT_EXISTS",
      status: 400,
    });
  }

  const subject = await db.create({
    model: "subjects",
    data: {
      name_en,
      name_ar,
      active,
      color,
    },
  });
  if (!subject) {
    return errorResponse({
      req,
      next,
      message: "CREATE_FAILED",
      status: 400,
    });
  }

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    status: 201,
    data: subject,
  });
});

export const updateSubject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name_en, name_ar, active, color } = req.body;

  const subject = await db.findOne({
    model: "subjects",
    where: { id },
  });

  if (!subject) {
    return errorResponse({
      req,
      next,
      message: "SUBJECT_NOT_FOUND",
      status: 404,
    });
  }

  // Prevent duplicate names
  if (name_en || name_ar) {
    const existsSubject = await db.findFirst({
      model: "subjects",
      where: {
        OR: [
          name_en ? { name_en } : undefined,
          name_ar ? { name_ar } : undefined,
        ].filter(Boolean),
        NOT: { id },
      },
    });

    if (existsSubject) {
      return errorResponse({
        req,
        next,
        message: "SUBJECT_EXISTS",
        status: 400,
      });
    }
  }

  // Prepare data for update (only sent fields)
  const data = {};
  if (name_en !== undefined) data.name_en = name_en;
  if (name_ar !== undefined) data.name_ar = name_ar;
  if (active !== undefined) data.active = active;
  if (color !== undefined) data.color = color;

  const updatedSubject = await db.updateOne({
    model: "subjects",
    where: { id },
    data,
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    status: 200,
    data: updatedSubject,
  });
});

export const deleteSubject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const subject = await db.findOne({
    model: "subjects",
    where: { id },
  });

  if (!subject) {
    return errorResponse({
      req,
      next,
      message: "SUBJECT_NOT_FOUND",
      status: 404,
    });
  }

  await db.deleteOne({
    model: "subjects",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
  });
});
