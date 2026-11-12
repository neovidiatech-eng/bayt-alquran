import {
  errorResponse,
  successResponse,
  asyncHandler,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import {
  getModeratorStudentIds,
  buildStudentScheduleFilter,
} from "../../Utils/Permissions/permissions.js";

export const getFeedback = asyncHandler(async (req, res, next) => {
  const { page, limit, search, studentId } = req.query;
  const where = {};

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    where.schedule = buildStudentScheduleFilter(assignedStudentIds, studentId);
  } else if (studentId) {
    where.schedule = {
      OR: [
        { studentId },
        { groupStudents: { some: { studentId } } },
      ],
    };
  }

  if (search) {
    where.OR = [
      {
        reviewee: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        reviewer: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const feedbacks = await db.findManyWithPaginationAndCount({
    model: "Review",
    page,
    limit,
    where,
    select: {
      id: true,
      schedule: true,
      reviewer: true,
      reviewee: true,
      rating: true,
      comment: true,
      role: true,
      isHidden: true,
      createdAt: true,
    },
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: { feedbacks },
  });
});

