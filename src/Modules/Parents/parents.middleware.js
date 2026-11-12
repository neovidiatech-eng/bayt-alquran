import { asyncHandler } from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";

export const isParent = () => {
  return asyncHandler(async (req, res, next) => {
    if (req.user?.role?.name?.toLowerCase() !== "parent") {
      return next(new Error("PARENT_ACCESS_ONLY", { cause: 403 }));
    }
    next();
  });
};

export const verifyStudentBelongsToParent = () => {
  return asyncHandler(async (req, res, next) => {
    const { studentId } = req.params;
    const parentId = req.user.id;

    const relation = await db.findFirst({
      model: "ParentStudent",
      where: {
        parentId,
        studentId,
      },
    });

    if (!relation) {
      return next(new Error("PARENT_STUDENT_ACCESS_DENIED", { cause: 403 }));
    }
    next();
  });
};
