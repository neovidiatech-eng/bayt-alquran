import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import {
  checkExist,
  getDatesBetweenUTC,
  combineDateAndTime,
  getEndTime,
  normalizeDate,
  formatSchedules,
} from "../../Utils/Helpers.js";
import { nanoid } from "nanoid";

import * as db from "../../database/dbService.js";
import { notificationType } from "../../Utils/Enums/sessions.js";
import {
  addNotificationJob,
  removeNotificationJob,
} from "../../Utils/Workers/notifications.js";
import {
  getNowUTC,
  isBeforeAllowedJoinTime,
  isInsideJoinWindow,
  toLocal,
} from "../../Utils/Date/time.js";
import dayjs from "dayjs";
import crypto from "crypto";
import { getSettingsData } from "../Settings/settings.controller.js";
import {
  buildJitsiRoomUrl,
  buildJitsiSessionData,
} from "../../Utils/Token/jitsiToken.js";

/* ------------------------------------------------------------------ */
/*            Admin creates multiple sessions in one request            */
/* ------------------------------------------------------------------ */
export const getAllSchedules = asyncHandler(async (req, res, next) => {
  const { search, start_date, end_date, page = 1, limit = 10 } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      {
        student: {
          user: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      },
      {
        teacher: {
          user: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  // 📅 فلترة بالتاريخ
  if (start_date && end_date) {
    where.start_time = {
      gte: normalizeDate(start_date),
      lte: normalizeDate(end_date),
    };
  }

  const { items: schedule, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "schedule",
      where,
      page,
      limit,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                code_country: true,
              },
            },
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                code_country: true,
              },
            },
          },
        },
        groupStudents: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    code_country: true,
                  },
                },
              },
            },
          },
        },
        subject: true,
      },
    });

  const formattedSchedules = formatSchedules(schedule, req.timezone);

  return successResponse({
    res,
    req,
    data: { schedule: formattedSchedules, pagination },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const createSchedule = asyncHandler(async (req, res, next) => {
  const {
    studentId,
    studentIds,
    isGroup = false,
    maxStudents = 10,
    teacherId,
    subject_id,
    title,
    description,
    link,
    notification_Time,
    notes,
    date,
    start_time,
  } = req.body;

  const targetStudentIds = isGroup
    ? Array.isArray(studentIds) && studentIds.length > 0
      ? studentIds
      : studentId
      ? [studentId]
      : []
    : studentId
    ? [studentId]
    : [];

  if (targetStudentIds.length === 0) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "STUDENT_ID_REQUIRED",
    });
  }

  /* check if teacher and subject exist */
  const [teacher, subject] = await Promise.all([
    checkExist({ model: "teacher", where: { id: teacherId }, next }),
    checkExist({ model: "subjects", where: { id: subject_id }, next }),
  ]);

  /* check students */
  const students = await db.findMany({
    model: "student",
    where: { id: { in: targetStudentIds } },
    include: { plan: true },
  });

  if (students.length !== targetStudentIds.length) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  const duration =
    students[0]?.plan?.sessionTime || (isGroup ? 60 : 45);

  const startTime = normalizeDate(start_time, req.timezone);
  const endTime = getEndTime({
    startTime,
    duration,
    tz: req.timezone,
  });

  /* check if teacher is available */
  const teacherSchedule = await db.findFirst({
    model: "schedule",
    where: {
      teacherId,
      status: { not: "cancelled" },
      start_time: { lt: endTime },
      end_time: { gt: startTime },
    },
  });

  if (teacherSchedule) {
    return errorResponse({
      req,
      next,
      status: 409,
      message: "TEACHER_CONFLICT",
      messageParams: { title: teacherSchedule.title },
    });
  }

  /* check if any student has conflict */
  const studentSchedule = await db.findFirst({
    model: "schedule",
    where: {
      status: { not: "cancelled" },
      start_time: { lt: endTime },
      end_time: { gt: startTime },
      OR: [
        { studentId: { in: targetStudentIds } },
        {
          groupStudents: {
            some: {
              studentId: { in: targetStudentIds },
              status: { not: "cancelled" },
            },
          },
        },
      ],
    },
  });

  if (studentSchedule) {
    return errorResponse({
      req,
      next,
      status: 409,
      message: "STUDENT_CONFLICT",
      messageParams: { title: studentSchedule.title },
    });
  }

  // Session balance check for each student
  const requiredSessions = 1;
  const insufficientStudent = students.find(
    (s) => (s.sessions_remaining || 0) < requiredSessions
  );
  if (insufficientStudent) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "INSUFFICIENT_SESSIONS",
      messageParams: { remaining: insufficientStudent.sessions_remaining },
    });
  }

  // Atomically create the schedule and deduct the session
  let newSchedule;
  const scheduleId = crypto.randomUUID();
  const meetingLink =
    link || teacher?.meeting_link || buildJitsiRoomUrl(scheduleId);

  await db.transaction(async (tx) => {
    newSchedule = await tx.create({
      model: "schedule",
      data: {
        id: scheduleId,
        isGroup: Boolean(isGroup),
        maxStudents: isGroup ? maxStudents || targetStudentIds.length : 1,
        studentId: isGroup ? null : targetStudentIds[0],
        teacherId,
        title,
        description,
        link: meetingLink,
        notes,
        subjectId: subject_id,
        start_time: startTime,
        end_time: endTime,
      },
    });

    if (isGroup) {
      for (const s of students) {
        await tx.create({
          model: "ScheduleStudent",
          data: {
            scheduleId,
            studentId: s.id,
            status: "enrolled",
          },
        });
        await tx.updateOne({
          model: "student",
          where: { id: s.id },
          data: { sessions_remaining: { decrement: requiredSessions } },
        });
      }
    } else {
      await tx.updateOne({
        model: "student",
        where: { id: targetStudentIds[0] },
        data: { sessions_remaining: { decrement: requiredSessions } },
      });
    }
  });

  let reminderTime;
  let notificationJobType;
  if (notification_Time === notificationType[1]) {
    reminderTime = new Date(startTime.getTime() - 10 * 60 * 1000);
    notificationJobType = "before 10 minutes";
  } else if (notification_Time === notificationType[2]) {
    reminderTime = new Date(startTime.getTime() - 30 * 60 * 1000);
    notificationJobType = "before 30 minutes";
  } else {
    reminderTime = new Date(startTime.getTime() - 60 * 60 * 1000);
    notificationJobType = "before 60 minutes";
  }

  const now = new Date();
  if (reminderTime > now) {
    for (const s of students) {
      addNotificationJob({
        scheduleId: newSchedule.id,
        studentId: s.id,
        type: notificationJobType,
        sendAt: reminderTime,
      });
    }
  }

  return successResponse({
    res,
    req,
    data: {
      schedule: formatSchedules(newSchedule, req.timezone),
      start_time_local: toLocal(newSchedule.start_time, req.timezone),
    },
    status: 201,
    message: "CREATE_SUCCESS",
  });
});

/* ------------------------------------------------------------------ */
/*            Admin creates recurring sessions in one request           */
/* ------------------------------------------------------------------ */
export const createRecurringSchedule = asyncHandler(async (req, res, next) => {
  const {
    studentId,
    studentIds,
    isGroup = false,
    maxStudents = 10,
    teacherId,
    subject_id,
    title,
    description,
    link,
    notes,
    startTime: timeStart, // "HH:mm"
    days, // ["Saturday", ...]
    startDate, // "2026-03-26"
    endDate, // "2026-04-26"
    count, // 10
    notification_Time,
  } = req.body;
  const skipedSchedules = [];
  const perSessionUnits = 1;

  const targetStudentIds = isGroup
    ? Array.isArray(studentIds) && studentIds.length > 0
      ? studentIds
      : studentId
      ? [studentId]
      : []
    : studentId
    ? [studentId]
    : [];

  if (targetStudentIds.length === 0) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "STUDENT_ID_REQUIRED",
    });
  }

  /* check exist student, teacher, subject */
  const [teacher, subject] = await Promise.all([
    checkExist({ model: "teacher", where: { id: teacherId }, next }),
    checkExist({ model: "subjects", where: { id: subject_id }, next }),
  ]);

  const students = await db.findMany({
    model: "student",
    where: { id: { in: targetStudentIds } },
    include: { plan: true },
  });

  if (students.length !== targetStudentIds.length) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  const minSessionsRemaining = Math.min(
    ...students.map((s) => s.sessions_remaining || 0)
  );

  const effectiveCount = count || (endDate ? null : minSessionsRemaining);

  let dates = getDatesBetweenUTC(startDate, endDate, days, effectiveCount);

  if (dates.length > minSessionsRemaining) {
    dates = dates.slice(
      0,
      Math.floor(minSessionsRemaining / perSessionUnits),
    );
  }

  if (dates.length === 0) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "INSUFFICIENT_SESSIONS_OR_INVALID_RANGE",
      messageParams: {
        remaining: minSessionsRemaining,
      },
    });
  }

  const createdSchedules = [];
  const schedulesToCreate = [];
  const notificationJobs = [];
  const parentRecurringId = `rec_${nanoid(10)}`;

  const allDatesStart = dates.map((d) => {
    return combineDateAndTime(d, timeStart, req.timezone);
  });
  // Determine the overall window for the batch conflict query
  const windowStart = allDatesStart[0];
  const lastDate = allDatesStart[allDatesStart.length - 1];
  const sessionDuration =
    students[0]?.plan?.sessionTime || (isGroup ? 60 : 45);
  const windowEnd = getEndTime({
    startTime: lastDate,
    duration: sessionDuration,
    tz: req.timezone,
  });

  // Pre-fetch ALL conflicts in 2 queries instead of 2-per-date (N+1 fix)
  const [allTeacherConflicts, allStudentConflicts] = await Promise.all([
    db.findMany({
      model: "schedule",
      where: {
        teacherId,
        status: { not: "cancelled" },
        start_time: { lt: windowEnd },
        end_time: { gt: windowStart },
      },
      select: { id: true, start_time: true, end_time: true, title: true },
    }),
    db.findMany({
      model: "schedule",
      where: {
        status: { not: "cancelled" },
        start_time: { lt: windowEnd },
        end_time: { gt: windowStart },
        OR: [
          { studentId: { in: targetStudentIds } },
          {
            groupStudents: {
              some: {
                studentId: { in: targetStudentIds },
                status: { not: "cancelled" },
              },
            },
          },
        ],
      },
      select: { id: true, start_time: true, end_time: true, title: true },
    }),
  ]);

  for (const date of dates) {
    const start_time = combineDateAndTime(date, timeStart, req.timezone);

    const end_time = getEndTime({
      startTime: start_time,
      duration: sessionDuration,
      tz: req.timezone,
    });

    // In-memory overlap check
    const teacher_conflict = allTeacherConflicts.find(
      (s) => s.start_time < end_time && s.end_time > start_time,
    );
    const student_conflict = allStudentConflicts.find(
      (s) => s.start_time < end_time && s.end_time > start_time,
    );

    if (student_conflict) {
      skipedSchedules.push({
        date: date.toISOString().split("T")[0],
        title: student_conflict.title,
        conflict: "STUDENT_NOT_AVAILABLE",
      });
      continue;
    }
    if (teacher_conflict) {
      skipedSchedules.push({
        date: date.toISOString().split("T")[0],
        title: teacher_conflict.title,
        conflict: "TEACHER_NOT_AVAILABLE",
      });
      continue;
    }

    const scheduleId = crypto.randomUUID();
    const meetingLink =
      link || teacher?.meeting_link || buildJitsiRoomUrl(scheduleId);

    schedulesToCreate.push({
      id: scheduleId,
      studentId: isGroup ? null : targetStudentIds[0],
      teacherId,
      title,
      description,
      link: meetingLink,
      notes,
      start_time,
      end_time,
      subjectId: subject_id,
      isGroup: Boolean(isGroup),
      maxStudents: isGroup ? maxStudents || targetStudentIds.length : 1,
      is_recurring: true,
      day_of_week: date.toLocaleDateString("en-US", { weekday: "long" }),
      parent_recurring_id: parentRecurringId,
    });

    notificationJobs.push({ start_time, notification_Time });
  }

  // Atomically create all valid schedules + deduct sessions in one transaction
  if (schedulesToCreate.length > 0) {
    await db.transaction(async (tx) => {
      for (const scheduleData of schedulesToCreate) {
        const schedule = await tx.create({
          model: "schedule",
          data: scheduleData,
        });

        if (isGroup) {
          for (const s of students) {
            await tx.create({
              model: "ScheduleStudent",
              data: {
                scheduleId: schedule.id,
                studentId: s.id,
                status: "enrolled",
              },
            });
          }
        }

        createdSchedules.push({
          id: schedule.id,
          date: scheduleData.start_time.toISOString().split("T")[0],
          start_time: scheduleData.start_time.toISOString(),
        });
      }

      if (isGroup) {
        for (const s of students) {
          await tx.updateOne({
            model: "student",
            where: { id: s.id },
            data: {
              sessions_remaining: {
                decrement: createdSchedules.length * perSessionUnits,
              },
            },
          });
        }
      } else {
        await tx.updateOne({
          model: "student",
          where: { id: targetStudentIds[0] },
          data: {
            sessions_remaining: {
              decrement: createdSchedules.length * perSessionUnits,
            },
          },
        });
      }
    });

    // Queue notification jobs after successful transaction
    const now = new Date();
    for (const { start_time: st, notification_Time: nt } of notificationJobs) {
      let reminderTime;
      let notificationJobType;
      if (nt === notificationType[1]) {
        reminderTime = new Date(st.getTime() - 10 * 60 * 1000);
        notificationJobType = "before 10 minutes";
      } else if (nt === notificationType[2]) {
        reminderTime = new Date(st.getTime() - 30 * 60 * 1000);
        notificationJobType = "before 30 minutes";
      } else {
        reminderTime = new Date(st.getTime() - 60 * 60 * 1000);
        notificationJobType = "before 60 minutes";
      }
      if (reminderTime > now) {
        const matchingScheduleId = createdSchedules[
          notificationJobs.indexOf({
            start_time: st,
            notification_Time: nt,
          })
        ]?.id;

        for (const s of students) {
          addNotificationJob({
            scheduleId: matchingScheduleId,
            studentId: s.id,
            type: notificationJobType,
            sendAt: reminderTime,
          });
        }
      }
    }
  }

  return successResponse({
    res,
    req,
    status: 201,
    message: createdSchedules.length
      ? "RECURRING_CREATE_SUCCESS"
      : "RECURRING_CREATE_WITH_CONFLICTS",
    messageParams: { length: skipedSchedules.length },
    data: { conflicts: skipedSchedules },
  });
});

/* ------------------------------------------------------------------ */
/*             Get all schedules (teacher dashboard / admin)            */
/* ------------------------------------------------------------------ */
export const getUserSchedules = asyncHandler(async (req, res, next) => {
  const { user } = req;
  const { status, search } = req.query;

  const where = {};
  if (status) where.status = status;

  // Handle filtering based on user role
  if (user.role?.name?.toLowerCase() === "teacher") {
    const teacher = user.teacher;
    if (!teacher) {
      return errorResponse({
        req,
        next,
        status: 404,
        message: "TEACHER_NOT_FOUND",
      });
    }
    where.teacherId = teacher.id;
  } else if (user.role?.name?.toLowerCase() === "student") {
    const student = user.student;
    if (!student) {
      return errorResponse({
        req,
        next,
        status: 404,
        message: "STUDENT_NOT_FOUND",
      });
    }
    where.OR = [
      { studentId: student.id },
      { groupStudents: { some: { studentId: student.id } } },
    ];
  }

  if (search) {
    if (where.teacherId) {
      // If teacher is viewing, search by student name
      where.student = {
        user: {
          name: { contains: search, mode: "insensitive" },
        },
      };
    } else if (where.studentId) {
      // If student is viewing, search by teacher name
      where.teacher = {
        user: {
          name: { contains: search, mode: "insensitive" },
        },
      };
    } else {
      // If admin, search by both
      where.OR = [
        {
          student: {
            user: { name: { contains: search, mode: "insensitive" } },
          },
        },
        {
          teacher: {
            user: { name: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }
  }

  const schedules = await db.findMany({
    model: "schedule",
    where,
    include: {
      student: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              code_country: true,
            },
          },
        },
      },
      teacher: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              code_country: true,
            },
          },
        },
      },
      groupStudents: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  code_country: true,
                },
              },
            },
          },
        },
      },
      subject: true,
    },
    orderBy: { start_time: "asc" },
  });

  const formattedSchedules = formatSchedules(schedules, req.timezone);

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: formattedSchedules,
  });
});

/* ------------------------------------------------------------------ */
/*                  Delete a single session & its job                   */
/* ------------------------------------------------------------------ */
export const deleteSchedule = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const schedule = await db.findFirst({
    model: "schedule",
    where: { id },
    include: { groupStudents: true },
  });

  if (!schedule) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "SESSION_NOT_FOUND",
    });
  }

  // Removal job from BullMQ
  await removeNotificationJob(id);

  // 🛡️ Use transaction to ensure refund and deletion happen together
  await db.transaction(async (tx) => {
    // Refund sessions if it wasn't already cancelled
    if (schedule.status !== "cancelled") {
      const refundSessions = 1;
      if (schedule.isGroup) {
        for (const gs of schedule.groupStudents || []) {
          await tx.updateOne({
            model: "student",
            where: { id: gs.studentId },
            data: { sessions_remaining: { increment: refundSessions } },
          });
        }
      } else if (schedule.studentId) {
        await tx.updateOne({
          model: "student",
          where: { id: schedule.studentId },
          data: { sessions_remaining: { increment: refundSessions } },
        });
      }
    }

    // Delete from DB
    await tx.deleteOne({
      model: "schedule",
      where: { id: id },
    });
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "DELETE_SUCCESS",
  });
});

/* ------------------------------------------------------------------ */
/*              Delete a recurring group & all its jobs                 */
/* ------------------------------------------------------------------ */
export const deleteRecurringGroup = asyncHandler(async (req, res, next) => {
  const { parent_recurring_id } = req.params;

  const schedules = await db.findMany({
    model: "schedule",
    where: { parent_recurring_id },
    select: { id: true },
  });

  const sessionsCount = schedules.length;

  if (!sessionsCount) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "RECURRING_GROUP_NOT_FOUND",
    });
  }

  // Remove all jobs
  await Promise.all(schedules.map((s) => removeNotificationJob(s.id)));

  // Refund sessions for sessions that weren't already cancelled
  const sessionsToRefund = await db.findMany({
    model: "schedule",
    where: { parent_recurring_id, status: { not: "cancelled" } },
    select: { id: true },
  });

  // 🛡️ Use transaction to ensure refund and mass deletion happen together
  await db.transaction(async (tx) => {
    if (sessionsToRefund.length > 0) {
      const totalRefund = sessionsToRefund.length;
      const firstSchedule = await tx.findFirst({
        model: "schedule",
        where: { parent_recurring_id },
      });

      if (firstSchedule) {
        await tx.updateOne({
          model: "student",
          where: { id: firstSchedule.studentId },
          data: { sessions_remaining: { increment: totalRefund } },
        });
      }
    }

    // Delete all sessions
    await tx.deleteMany({
      model: "schedule",
      where: { parent_recurring_id },
    });
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "RECURRING_DELETE_SUCCESS",
    messageParams: { length: schedules.length },
  });
});

/* ------------------------------------------------------------------ */
/*                  Update a single session & its job                   */
/* ------------------------------------------------------------------ */
export const updateSchedule = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { start_time, notification_Time, ...otherData } = req.body;

  const schedule = await db.findOne({
    model: "schedule",
    where: { id },
    include: { student: { include: { plan: true } } },
  });

  if (!schedule) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "SESSION_NOT_FOUND",
    });
  }

  let startTime = schedule.start_time;
  let endTime = schedule.end_time;

  let scheduleUpdated = false;

  const updateData = { ...otherData };

  // If time or type changes, recalculate end time and check conflicts
  if (start_time || type) {
    startTime = start_time
      ? normalizeDate(start_time, req.timezone)
      : startTime;
    sessionType = type || sessionType;
    endTime = getEndTime(
      startTime,
      sessionType,
      schedule.student.plan?.sessionTime,
      req.timezone,
    );

    updateData.start_time = startTime;
    updateData.end_time = endTime;
    updateData.type = sessionType;
    scheduleUpdated = true;

    // Conflict check
    const teacher_conflict = await db.findFirst({
      model: "schedule",
      where: {
        teacherId: schedule.teacherId,
        id: { not: id },
        start_time: { lt: endTime },
        end_time: { gt: startTime },
      },
    });
    const student_conflict = await db.findFirst({
      model: "schedule",
      where: {
        studentId: schedule.studentId,
        id: { not: id },
        start_time: { lt: endTime },
        end_time: { gt: startTime },
      },
    });

    if (teacher_conflict || student_conflict) {
      return errorResponse({
        req,
        next,
        status: 409,
        message: "SESSION_CONFLICT",
      });
    }
  }

  // Handle session adjustments for status change
  if (otherData.status && otherData.status !== schedule.status) {
    const sessionUnits = 1;
    if (otherData.status === "cancelled") {
      // Refund
      await db.updateOne({
        model: "student",
        where: { id: schedule.studentId },
        data: { sessions_remaining: { increment: sessionUnits } },
      });
    } else if (schedule.status === "cancelled") {
      // Restoring: Deduct
      if (schedule.student.sessions_remaining < sessionUnits) {
        return errorResponse({
          req,
          next,
          status: 400,
          message: "INSUFFICIENT_SESSIONS_RESTORE",
        });
      }
      await db.updateOne({
        model: "student",
        where: { id: schedule.studentId },
        data: { sessions_remaining: { decrement: sessionUnits } },
      });
    }
  }

  // Adjust sessions if type changed (no longer affects session units but keeping logic structure)
  // Since 1 session = 1 unit regardless of type, no unit adjustment needed on type change.

  const updatedSchedule = await db.updateOne({
    model: "schedule",
    where: { id },
    data: updateData,
  });

  // Handle notification job update
  if (scheduleUpdated || notification_Time || otherData.status) {
    await removeNotificationJob(id);

    // Only add a new job if the session is still "planned"
    const currentStatus = otherData.status || updatedSchedule.status;
    if (currentStatus === "planned") {
      const effectiveNotificationTime = notification_Time || "60";

      let reminderTime;
      let notificationJobType;
      if (effectiveNotificationTime === notificationType[1]) {
        reminderTime = new Date(startTime.getTime() - 10 * 60 * 1000);
        notificationJobType = "before 10 minutes";
      } else if (effectiveNotificationTime === notificationType[2]) {
        reminderTime = new Date(startTime.getTime() - 30 * 60 * 1000);
        notificationJobType = "before 30 minutes";
      } else {
        reminderTime = new Date(startTime.getTime() - 60 * 60 * 1000);
        notificationJobType = "before 60 minutes";
      }

      const now = new Date();
      if (reminderTime > now) {
        addNotificationJob({
          scheduleId: id,
          studentId: schedule.studentId,
          type: notificationJobType,
          sendAt: reminderTime,
        });
      }
    }
  }

  return successResponse({
    res,
    req,
    status: 200,
    message: "UPDATE_SUCCESS",
    data: formatSchedules(updatedSchedule, req.timezone),
  });
});

/* ------------------------------------------------------------------ */
/*                      Session Lifecycle Logic                        */
/* ------------------------------------------------------------------ */

export const joinSession = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  const role = user.role?.name?.toLowerCase();

  const session = await db.findOne({
    model: "schedule",
    where: { id },
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } },
      groupStudents: { include: { student: { include: { user: true } } } },
    },
  });

  if (!session) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "SESSION_NOT_FOUND",
    });
  }

  if (
    session.status === "cancelled" ||
    session.status === "completed" ||
    session.status === "missed"
  ) {
    return errorResponse({
      req,
      next,
      status: 400,
      message:
        session.status === "cancelled"
          ? "SESSION_CANCELLED"
          : "SESSION_ALREADY_FINISHED",
    });
  }

  // 1. Participant check
  const isTeacher = session.teacher?.user?.id === user.id;
  const isIndividualStudent = session.student?.user?.id === user.id;
  const isGroupStudent =
    Boolean(session.isGroup) &&
    session.groupStudents?.some((gs) => gs.student?.user?.id === user.id);
  const isStudent = isIndividualStudent || isGroupStudent;
  const isAdminUser = [
    "admin",
    "superadmin",
    "super_admin",
    "staff",
    "stuff",
  ].includes(role);

  if (!isTeacher && !isStudent && !isAdminUser) {
    return errorResponse({
      req,
      next,
      status: 403,
      message: "NOT_A_PARTICIPANT",
    });
  }

  // 2. Check if it's too early (UTC comparison)
  if (isBeforeAllowedJoinTime(session.start_time, 5)) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "TOO_EARLY_TO_JOIN",
      messageParams: {
        now: toLocal(getNowUTC(), req.timezone),
        start: toLocal(session.start_time, req.timezone),
      },
    });
  }

  // 3. Check if it's already finished (UTC comparison)
  const now = getNowUTC();
  const endTime = dayjs.utc(session.end_time);
  if (now.isAfter(endTime) || now.isSame(endTime)) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "SESSION_ALREADY_FINISHED",
    });
  }

  const nowUTC = getNowUTC().toDate();

  // Get or Create Log
  let log = await db.findFirst({
    model: "scheduleLog",
    where: { scheduleId: id },
  });
  if (!log) {
    log = await db.create({
      model: "scheduleLog",
      data: { scheduleId: id },
    });
  }

  const updateData = {};
  if (isStudent || role === "student") {
    if (session.isGroup) {
      const enrollment = session.groupStudents?.find(
        (gs) => gs.student?.user?.id === user.id
      );
      if (enrollment) {
        await db.updateOne({
          model: "ScheduleStudent",
          where: { id: enrollment.id },
          data: {
            joinedAt: nowUTC,
            status: "attended",
          },
        });
      }
    } else {
      updateData.joinTime_student = nowUTC;
    }
  } else if (isTeacher || role === "teacher") {
    updateData.joinTime_teacher = nowUTC;
    const settings = await getSettingsData();
    const rules = settings.lateDiscountRules || [];
    const diffMinutes =
      (nowUTC.getTime() - session.start_time.getTime()) / (60 * 1000);
    const isLate = rules.some((r) => diffMinutes >= r.lateMinutes);
    if (isLate) {
      updateData.isTeacherLate = true;
      // Notify Admin (Simple record in notification table)
      await db.create({
        model: "notification",
        data: {
          userId: "admin", // Placeholder or fetch actual admin
          title: req.t("NOTIFICATION_TEACHER_LATE_TITLE"),
          message: req.t("NOTIFICATION_TEACHER_LATE_MSG", { id }),
          type: "teacher_late",
        },
      });
    }
  }

  await db.updateOne({
    model: "scheduleLog",
    where: { id: log.id },
    data: updateData,
  });

  if (session.status === "scheduled") {
    await db.updateOne({
      model: "schedule",
      where: { id },
      data: { status: "ongoing" },
    });
  }

  // Notify other party
  if (isStudent || role === "student") {
    if (session.teacher?.user?.id) {
      await db.create({
        model: "notification",
        data: {
          userId: session.teacher.user.id,
          title: req.t("NOTIFICATION_SESSION_JOINED_TITLE"),
          message: req.t("NOTIFICATION_SESSION_JOINED_MSG", {
            role: req.t("STUDENT"),
          }),
          type: "session_joined",
        },
      });
    }
  } else if (isTeacher || role === "teacher") {
    const targetUserIds = session.isGroup
      ? (session.groupStudents || [])
          .map((gs) => gs.student?.user?.id)
          .filter(Boolean)
      : session.student?.user?.id
      ? [session.student.user.id]
      : [];

    for (const uId of targetUserIds) {
      await db.create({
        model: "notification",
        data: {
          userId: uId,
          title: req.t("NOTIFICATION_SESSION_JOINED_TITLE"),
          message: req.t("NOTIFICATION_SESSION_JOINED_MSG", {
            role: req.t("TEACHER"),
          }),
          type: "session_joined",
        },
      });
    }
  }

  // Generate Jitsi Meeting Data
  const isModerator = isTeacher || isAdminUser;
  const meetingData = buildJitsiSessionData({
    scheduleId: session.id,
    user,
    isModerator,
    startTime: session.start_time,
    endTime: session.end_time,
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "JOINED_SUCCESS",
    data: meetingData,
  });
});

export const leaveSession = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  const role = user.role?.name?.toLowerCase();

  const log = await db.findFirst({
    model: "scheduleLog",
    where: { scheduleId: id },
    include: { schedule: true },
  });

  if (!log) {
    return errorResponse({ req, next, status: 404, message: "LOG_NOT_FOUND" });
  }

  const session = log.schedule;
  const nowUTC = getNowUTC().toDate();
  const updateData = {};

  if (session.isGroup && (role === "student" || user.student)) {
    const studentRecord = await db.findFirst({
      model: "student",
      where: { user_id: user.id },
    });
    if (studentRecord) {
      const enrollment = await db.findFirst({
        model: "ScheduleStudent",
        where: { scheduleId: id, studentId: studentRecord.id },
      });
      if (enrollment && enrollment.joinedAt) {
        const duration = (nowUTC - enrollment.joinedAt) / 60000;
        await db.updateOne({
          model: "ScheduleStudent",
          where: { id: enrollment.id },
          data: {
            leftAt: nowUTC,
            duration,
          },
        });
      }
    }
  } else if (role === "student") {
    if (!log.joinTime_student)
      return errorResponse({ req, next, status: 400, message: "NEVER_JOINED" });
    updateData.leaveTime_student = nowUTC;
    const duration = (nowUTC - log.joinTime_student) / 60000;
    updateData.duration_student = duration;
  } else if (role === "teacher") {
    if (!log.joinTime_teacher)
      return errorResponse({ req, next, status: 400, message: "NEVER_JOINED" });
    updateData.leaveTime_teacher = nowUTC;
    const duration = (nowUTC - log.joinTime_teacher) / 60000;
    updateData.duration_teacher = duration;
  }

  await db.updateOne({
    model: "scheduleLog",
    where: { id: log.id },
    data: updateData,
  });

  // If session end time passed, finalize
  if (nowUTC >= session.end_time) {
    await finalizeSession(id, req.t);
  } else {
    // Check if both have left (for individual)
    const updatedLog = await db.findFirst({
      model: "scheduleLog",
      where: { id: log.id },
    });
    if (!session.isGroup && updatedLog.leaveTime_student && updatedLog.leaveTime_teacher) {
      await finalizeSession(id, req.t);
    }
  }
  return successResponse({ res, req, status: 200, message: "LEFT_SUCCESS" });
});

export const submitReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const user = req.user;

  const session = await db.findOne({
    model: "schedule",
    where: { id },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      scheduleLogs: true,
    },
  });

  if (!session) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "SESSION_NOT_FOUND",
    });
  }

  const allowedStatuses = ["ongoing", "completed", "missed"];

  if (!allowedStatuses.includes(session.status)) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "SESSION_NOT_READY_FOR_REVIEW",
    });
  }

  const now = new Date();
  const deadline = new Date(session.end_time.getTime() + 48 * 60 * 60 * 1000);

  if (now > deadline) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "REVIEW_WINDOW_EXPIRED",
    });
  }

  const isStudent = user.id === session.student.user.id;
  const isTeacher = user.id === session.teacher.user.id;

  if (!isStudent && !isTeacher) {
    return errorResponse({
      req,
      next,
      status: 403,
      message: "NOT_A_PARTICIPANT",
    });
  }

  let log = session.scheduleLogs?.[0];

  if (!log) {
    log = await db.upsertOne({
      model: "scheduleLog",
      where: { scheduleId: id },
      update: {},
      create: {
        scheduleId: id,
        isStudentAttended: false,
      },
    });
  }

  const teacherActuallyAttended =
    log.isTeacherCompleted === true || Boolean(log.joinTime_teacher);

  const studentActuallyAttended = Boolean(log.joinTime_student);

  // الطالب الغايب ماينفعش يعمل review
  if (isStudent && !studentActuallyAttended) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "ABSENT_STUDENT_CANNOT_REVIEW",
    });
  }

  // المدرس الغايب ماينفعش يعمل review
  if (isTeacher && !teacherActuallyAttended) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "ABSENT_TEACHER_CANNOT_REVIEW",
    });
  }

  const existingReview = await db.findFirst({
    model: "Review",
    where: {
      scheduleId: id,
      reviewerId: user.id,
    },
  });

  if (existingReview) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "ALREADY_REVIEWED",
    });
  }

  const revieweeId = isStudent
    ? session.teacher.user.id
    : session.student.user.id;

  const role = isStudent ? "student" : "teacher";

  let review;

  await db.transaction(async (tx) => {
    /*
      Settlement should happen once only.
      Do not depend on req.body.teacherAttended or req.body.studentAttended.
    */
    if (log.isStudentAttended !== studentActuallyAttended) {
      await tx.updateOne({
        model: "scheduleLog",
        where: { id: log.id },
        data: { isStudentAttended: studentActuallyAttended },
      });
    }

    if (session.status === "ongoing") {
      if (!teacherActuallyAttended) {
        // Teacher absent => refund student
        await tx.updateOne({
          model: "student",
          where: { id: session.studentId },
          data: {
            sessions_remaining: { increment: 1 },
          },
        });

        await tx.updateOne({
          model: "schedule",
          where: { id },
          data: {
            status: "missed",
          },
        });
      } else {
        // Teacher attended => calculate payout
        const sessionDuration =
          (session.end_time - session.start_time) / (60 * 1000 * 60);

        let payoutAmount = sessionDuration * session.teacher.hour_price;

        const isLate = log.isTeacherLate === true;

        if (isLate && log.joinTime_teacher) {
          const settings = await getSettingsData();
          const rules = settings.lateDiscountRules || [];

          const diffMinutes =
            (log.joinTime_teacher.getTime() - session.start_time.getTime()) /
            (60 * 1000);

          const sortedRules = [...rules].sort(
            (a, b) => b.lateMinutes - a.lateMinutes,
          );

          const matchedRule = sortedRules.find(
            (rule) => diffMinutes >= rule.lateMinutes,
          );

          if (matchedRule) {
            const discountFactor = 1 - matchedRule.discountPercentage / 100;
            payoutAmount = payoutAmount * discountFactor;
          }
        }

        const teacherWallet = await tx.findFirst({
          model: "Wallet",
          where: {
            userId: session.teacher.user_id,
          },
        });

        if (teacherWallet) {
          await tx.updateOne({
            model: "Wallet",
            where: { id: teacherWallet.id },
            data: {
              balance: { increment: payoutAmount },
            },
          });
        }

        await tx.updateOne({
          model: "schedule",
          where: { id },
          data: {
            status: "completed",
          },
        });

        // Only count attended session if student really attended
        if (studentActuallyAttended) {
          await tx.updateOne({
            model: "student",
            where: { id: session.studentId },
            data: {
              sessions_attended: { increment: 1 },
            },
          });
        }
      }
    }

    review = await tx.create({
      model: "Review",
      data: {
        scheduleId: id,
        reviewerId: user.id,
        revieweeId,
        rating: parseInt(rating, 10),
        comment,
        role,
      },
    });
  });

  await updateAverageRating(revieweeId);

  await db.create({
    model: "notification",
    data: {
      userId: revieweeId,
      title: req.t("NOTIFICATION_REVIEW_RECEIVED_TITLE"),
      message: req.t("NOTIFICATION_REVIEW_RECEIVED_MSG", { rating }),
      type: "review_received",
    },
  });

  return successResponse({
    res,
    req,
    status: 201,
    message: "REVIEW_SUBMITTED",
    data: review,
  });
});

/* ------------------------------------------------------------------ */
/*                         Helper Functions                           */
/* ------------------------------------------------------------------ */

async function finalizeSession(scheduleId, t) {
  const session = await db.findOne({
    model: "schedule",
    where: { id: scheduleId },
    include: {
      scheduleLogs: true,
      student: true,
      teacher: { include: { user: true } },
    },
  });

  if (!session || session.status === "completed" || session.status === "missed")
    return;

  const log = session.scheduleLogs[0];
  if (!log) return;

  let newStatus = "completed";
  if (!log.joinTime_student && !log.joinTime_teacher) {
    newStatus = "missed";
  }

  await db.updateOne({
    model: "schedule",
    where: { id: scheduleId },
    data: { status: newStatus },
  });

  // Notify if missed
  if (newStatus === "missed") {
    await db.create({
      model: "notification",
      data: {
        userId: session.student.user_id,
        title: t ? t("NOTIFICATION_SESSION_MISSED_TITLE") : "Session Missed",
        message: t
          ? t("NOTIFICATION_SESSION_MISSED_MSG", { title: session.title })
          : `The session ${session.title} was marked as missed.`,
        type: "session_missed",
      },
    });
  }
}

async function updateAverageRating(userId) {
  const reviews = await db.findMany({
    model: "Review",
    where: { revieweeId: userId, isHidden: false },
  });

  if (reviews.length === 0) return;

  const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = totalRating / reviews.length;

  // Try updating teacher
  const teacher = await db.findFirst({
    model: "teacher",
    where: { user_id: userId },
  });
  if (teacher) {
    await db.updateOne({
      model: "teacher",
      where: { id: teacher.id },
      data: { avgRating: avg, totalReviews: reviews.length },
    });
  } else {
    // Try updating student
    const student = await db.findFirst({
      model: "student",
      where: { user_id: userId },
    });
    if (student) {
      await db.updateOne({
        model: "student",
        where: { id: student.id },
        data: { avgRating: avg, totalReviews: reviews.length },
      });
    }
  }
}
