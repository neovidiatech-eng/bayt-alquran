import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { normalizeDate } from "../../Utils/Helpers.js";

// 1. Create Request (Teacher/Student)
export const createRequest = asyncHandler(async (req, res, next) => {
  const { sessionId, type, reason, requestedData } = req.body;
  const requesterId = req.user.id;
  const requesterRole = req.user.role.name;

  // If session-related request, verify session exists
  if (sessionId) {
    const session = await db.findOne({
      model: "schedule",
      where: { id: sessionId },
    });
    if (!session) {
      return errorResponse({
        req,
        next,
        status: 404,
        message: "SESSION_NOT_FOUND",
      });
    }
  }
  const request = await db.create({
    model: "session_request",
    data: {
      sessionId,
      requesterId,
      requesterRole,
      type,
      reason,
      requestedData,
      status: "pending",
    },
  });

  // Create Audit Log
  await db.create({
    model: "audit_log",
    data: {
      entityType: "request",
      entityId: request.id,
      action: "create",
      userId: requesterId,
      changes: { type, sessionId },
    },
  });

  return successResponse({
    res,
    req,
    data: request,
    status: 201,
    message: "REQUEST_SUBMITTED", // You'll need to add this to en/ar.json
  });
});

// 2. Get All Requests (Admin)
export const getAllRequests = asyncHandler(async (req, res, next) => {
  const { status, type } = req.query;
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const requests = await db.findMany({
    model: "session_request",
    where,
    include: {
      requester: { select: { name: true, email: true } },
      schedule: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({ res, data: requests });
});

// 3. Approve Request (Admin)
export const approveRequest = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.id;

  const request = await db.findOne({
    model: "session_request",
    where: { id },
    include: { schedule: true },
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

  const { type, sessionId, requestedData } = request;

  await db.transaction(async (tx) => {
    // 1. Update Request Status
    await tx.updateOne({
      model: "session_request",
      where: { id },
      data: { status: "approved", adminId, adminNotes },
    });

    // 2. Process based on type
    if (type === "reschedule" && sessionId) {
      const oldSession = request.schedule;

      if (!oldSession) {
        throw new Error("RELATED_SESSION_NOT_FOUND");
      }

      const startTime = normalizeDate(requestedData.new_start_time);
      const endTime = normalizeDate(requestedData.new_end_time);

      // Conflict check
      const teacher_conflict = await tx.findFirst({
        model: "schedule",
        where: {
          teacherId: oldSession.teacherId,
          status: { not: "cancelled" },
          start_time: { lt: endTime },
          end_time: { gt: startTime },
        },
      });
      const student_conflict = await tx.findFirst({
        model: "schedule",
        where: {
          studentId: oldSession.studentId,
          status: { not: "cancelled" },
          start_time: { lt: endTime },
          end_time: { gt: startTime },
        },
      });

      if (teacher_conflict || student_conflict) {
        throw new Error("SESSION_CONFLICT");
      }

      // Create new rescheduled session
      const newSession = await tx.create({
        model: "schedule",
        data: {
          teacherId: oldSession.teacherId,
          studentId: oldSession.studentId,
          subjectId: oldSession.subjectId,
          title: oldSession.title,
          description: oldSession.description,
          link: oldSession.link,
          start_time: startTime,
          end_time: endTime,
          notes: requestedData.suggested_notes || oldSession.notes,
          rescheduledFromId: oldSession.id,
          status: "rescheduled",
        },
      });

      // Delete old session
      await tx.deleteOne({
        model: "schedule",
        where: { id: oldSession.id },
      });
    } else if (type === "cancel" && sessionId) {
      await tx.updateOne({
        model: "schedule",
        where: { id: sessionId },
        data: { status: "cancelled" },
      });

      // Refund session count to student
      const session = await tx.findOne({
        model: "schedule",
        where: { id: sessionId },
      });
      await tx.updateOne({
        model: "student",
        where: { id: session.studentId },
        data: { sessions_remaining: { increment: 1 } },
      });
    } else if (type === "new_session") {
      const startTime = normalizeDate(requestedData.new_start_time);
      const endTime = normalizeDate(requestedData.new_end_time);
      const teacherId = requestedData.teacherId || request.requesterId;
      const studentId = requestedData.studentId;

      // Conflict check
      const teacher_conflict = await tx.findFirst({
        model: "schedule",
        where: {
          teacherId,
          status: { not: "cancelled" },
          start_time: { lt: endTime },
          end_time: { gt: startTime },
        },
      });
      const student_conflict = await tx.findFirst({
        model: "schedule",
        where: {
          studentId,
          status: { not: "cancelled" },
          start_time: { lt: endTime },
          end_time: { gt: startTime },
        },
      });

      if (teacher_conflict || student_conflict) {
        throw new Error("SESSION_CONFLICT");
      }

      await tx.create({
        model: "schedule",
        data: {
          teacherId,
          studentId,
          subjectId: requestedData.subjectId,
          title: requestedData.title || req.t("NEW_SESSION_TITLE"),
          description: req.t("SESSION_CREATED_VIA_REQUEST"),
          link: "",
          start_time: startTime,
          end_time: endTime,
          notes: requestedData.suggested_notes,
          status: "scheduled",
        },
      });
    } else if (type === "absence_correction" && sessionId) {
      await tx.updateOne({
        model: "schedule",
        where: { id: sessionId },
        data: { status: requestedData.new_status },
      });
    }

    // 3. Create Audit Log
    await tx.create({
      model: "audit_log",
      data: {
        entityType: "request",
        entityId: id,
        action: "approve",
        userId: adminId,
        changes: { from: "pending", to: "approved" },
      },
    });
  });

  return successResponse({
    res,
    req,
    message: "REQUEST_APPROVED",
  });
});

// 4. Reject Request (Admin)
export const rejectRequest = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.id;

  const request = await db.findOne({ model: "session_request", where: { id } });
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

  await db.updateOne({
    model: "session_request",
    where: { id },
    data: { status: "rejected", adminId, adminNotes },
  });

  return successResponse({
    res,
    req,
    message: "REQUEST_REJECTED",
  });
});

export const getMyRequests = asyncHandler(async (req, res, next) => {
  const { status, type } = req.query;
  const user = req.user.id;

  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  const requests = await db.findMany({
    model: "session_request",
    where: {
      requesterId: user,
      ...where,
    },
    include: {
      schedule: true,
      requester: true,
    },
  });

  return successResponse({ res, data: requests });
});
