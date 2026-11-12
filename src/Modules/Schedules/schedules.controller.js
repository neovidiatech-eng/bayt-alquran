import {
  buildJitsiRoomUrl,
  buildJitsiSessionData,
} from "../../Utils/Token/jitsiToken.js";
import crypto from "crypto";
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
import { checkAndUpdateStudentRank } from "../Ranks/ranks.service.js";
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
import { getSettingsData } from "../Settings/settings.controller.js";
import { createAdminNotification, createNotification, createTeacherAndStudentNotification } from "../Notifications/notifications.controller.js";
import { studentPaidStatus } from "../../Utils/Enums/studentts.js";
import {
  getModeratorStudentIds,
  buildStudentScheduleFilter,
} from "../../Utils/Permissions/permissions.js";

/* ------------------------------------------------------------------ */
/*            Admin creates multiple sessions in one request            */
/* ------------------------------------------------------------------ */
export const getAllSchedules = asyncHandler(async (req, res, next) => {
  const {
    search,
    start_date,
    end_date,
    teacherId,
    studentId,
    status,
    isGroup,
    subjectId,
    page = 1,
    limit = 10,
    sort_type = "createdAt",
    sort_order = "desc"
  } = req.query;

  const where = {};
  const orderBy = {};

  if (sort_order === "asc") {
    orderBy[sort_type] = "asc";
  } else {
    orderBy[sort_type] = "desc";
  }
  if (status) {
    where.status = status;
  }

  if (isGroup !== undefined) {
    where.isGroup = isGroup === "true";
  }

  if (teacherId) {
    where.teacherId = teacherId;
  }

  if (subjectId) {
    where.subjectId = subjectId;
  }

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    where.AND = where.AND || [];
    where.AND.push(buildStudentScheduleFilter(assignedStudentIds, studentId));
  } else if (studentId) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { studentId: studentId },
        { groupStudents: { some: { studentId: studentId } } },
      ],
    });
  }

  if (search) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
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
        {
          groupStudents: {
            some: {
              student: {
                user: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
      ],
    });
  }

  // 📅 فلترة بالتاريخ
  if (start_date && end_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
      lte: normalizeDate(end_date, req.timezone),
    };
  } else if (start_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
    };
  } else if (end_date) {
    where.start_time = {
      lte: normalizeDate(end_date, req.timezone),
    };
  }

  const { items: schedule, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "schedule",
      where,
      page,
      limit,
      orderBy,
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
        subject: true,
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

        reviews:true
      },
    });

  const formattedSchedules = formatSchedules(schedule, req.timezone);

  return successResponse({
    res,
    req,
    data: {
      schedules: formattedSchedules,
      schedule: formattedSchedules,
      pagination,
    },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const createSchedule = asyncHandler(async (req, res, next) => {
  const {
    studentId,
    studentIds = [],
    teacherId,
    subject_id,
    title,
    description,
    link,
    notification_Time = "10",
    notes,
    date,
    start_time,
    maxStudents = "1",
  } = req.body;

  const effectiveStudentIds = Array.from(
    new Set([studentId, ...studentIds].filter(Boolean))
  );

  if (effectiveStudentIds.length === 0) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    const unauthorized = effectiveStudentIds.find(
      (id) => !assignedStudentIds.includes(id),
    );
    if (unauthorized) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "FORBIDDEN",
      });
    }
  }

  const isGroup =
    effectiveStudentIds.length > 1 ? true : Boolean(req.body.isGroup);

  /* check if students and teacher exist */
  const [students, teacher, subject] = await Promise.all([
    db.findMany({
      model: "student",
      where: { id: { in: effectiveStudentIds } },
      include: { plan: true, user: true },
    }),
    checkExist({ model: "teacher", where: { id: teacherId }, next }),
    checkExist({ model: "subjects", where: { id: subject_id }, next }),
  ]);

  const student =
    students.find((s) => s.id === (studentId || effectiveStudentIds[0])) ||
    students[0];

  if (!students.length || !student) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  const startTime = normalizeDate(start_time, req.timezone);
  const endTime = getEndTime({
    startTime,
    duration: student.plan?.sessionTime,
    tz: req.timezone,
  });

  const nowsessions = getNowUTC().toDate();
  if (startTime < nowsessions) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "CANNOT_CREATE_SESSION_IN_PAST",
    });
  }

  /* check max students */
  let normalizedMaxStudents =
    maxStudents === "0" || maxStudents === 0 || maxStudents === "unlimited"
      ? "unlimited"
      : String(maxStudents);

  if (isGroup && normalizedMaxStudents !== "unlimited") {
    const max = parseInt(normalizedMaxStudents, 10);
    if (!isNaN(max) && effectiveStudentIds.length > max) {
      if (req.body.maxStudents !== undefined) {
        return errorResponse({
          req,
          next,
          status: 400,
          message: "EXCEEDED_MAX_STUDENTS",
        });
      } else {
        normalizedMaxStudents = String(effectiveStudentIds.length);
      }
    }
  }

  const [studentSchedule, teacherSchedule] = await Promise.all([
    db.findFirst({
      model: "schedule",
      where: {
        status: { not: "cancelled" },
        start_time: { lt: endTime },
        end_time: { gt: startTime },
        OR: [
          { studentId: { in: effectiveStudentIds } },
          { groupStudents: { some: { studentId: { in: effectiveStudentIds } } } },
        ],
      },
    }),

    db.findFirst({
      model: "schedule",
      where: {
        teacherId,
        status: { not: "cancelled" },
        start_time: { lt: endTime },
        end_time: { gt: startTime },
      },
    }),
  ]);

  if (studentSchedule) {
    return errorResponse({
      req,
      next,
      status: 409,
      message: "STUDENT_CONFLICT",
      messageParams: { title: studentSchedule.title },
    });
  }

  if (teacherSchedule) {
    return errorResponse({
      req,
      next,
      status: 409,
      message: "TEACHER_CONFLICT",
      messageParams: { title: teacherSchedule.title },
    });
  }

  // Session check across all enrolled students
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
  const newScheduleId = crypto.randomUUID();
  let newSchedule;

  await db.transaction(async (tx) => {
    newSchedule = await tx.create({
      model: "schedule",
      data: {
        id: newScheduleId,
        studentId: isGroup ? null : studentId || effectiveStudentIds[0],
        teacherId,
        title,
        description,
        link: link || teacher?.meeting_link || buildJitsiRoomUrl(newScheduleId),
        notes,
        subjectId: subject_id,
        start_time: startTime,
        end_time: endTime,
        isGroup,
        maxStudents: isGroup ? normalizedMaxStudents : "1",
      },
    });

    for (const sId of effectiveStudentIds) {
      if (isGroup) {
        await tx.create({
          model: "GroupScheduleStudent",
          data: {
            scheduleId: newSchedule.id,
            studentId: sId,
          },
        });
      }

      await tx.updateOne({
        model: "student",
        where: { id: sId },
        data: { sessions_remaining: { decrement: requiredSessions } },
      });

      await tx.upsertOne({
        model: "student_teacher",
        where: { studentId_teacherId: { studentId: sId, teacherId } },
        update: {},
        create: { studentId: sId, teacherId, hour_price: teacher?.hour_price ?? 0 },
      });
    }

    // Schedule log
    await tx.create({
      model: "scheduleLog",
      data: {
        scheduleId: newSchedule.id,
      },
    });
  });

  // BullMQ notification job setup
  let notificationJobType;
  let reminderTime;
  if (notification_Time === notificationType[1]) {
    reminderTime = new Date(startTime.getTime() - 10 * 60 * 1000);
    notificationJobType = "before 10 minutes";
  } else if (notification_Time === notificationType[2]) {
    reminderTime = new Date(startTime.getTime() - 30 * 60 * 1000);
    notificationJobType = "before 30 minutes";
  } else if (notification_Time === notificationType[3]) {
    reminderTime = new Date(startTime.getTime() - 60 * 60 * 1000);
    notificationJobType = "before 60 minutes";
  } else {
    reminderTime = new Date(startTime.getTime() - 5 * 60 * 1000);
    notificationJobType = "before 5 minutes";
  }

  const now = new Date();
  if (reminderTime > now) {
    addNotificationJob({
      scheduleId: newSchedule.id,
      studentId: studentId || effectiveStudentIds[0],
      type: notificationJobType,
      sendAt: reminderTime,
    });
  }

  const teacherInfo = await db.findOne({
    model: "teacher",
    where: { id: teacherId },
    include: { user: true },
  });

  const teacherName = teacherInfo?.user?.name || "Teacher";
  const studentNames =
    students.map((s) => s.user?.name || "Student").join(", ") || "Student";

  const notificationPromises = students
    .filter((s) => s.user?.id)
    .map((s) =>
      createTeacherAndStudentNotification({
        title: "تم جدولة الجلسة",
        message: `تم جدولة جلسة جديدة "${title}" للطالب: ${s.user?.name || "Student"} مع المدرس: ${teacherName}.`,
        type: "session_created",
        teacherId: teacherInfo?.user?.id,
        studentId: s.user.id,
      })
    );

  notificationPromises.push(
    createAdminNotification({
      title: "تم جدولة الجلسة",
      message: `تم جدولة جلسة جديدة "${title}" للطالب: ${studentNames} مع المدرس: ${teacherName}.`,
      type: "session_created",
    })
  );

  await Promise.all(notificationPromises);

  const fullSchedule = await db.findOne({
    model: "schedule",
    where: { id: newSchedule.id },
    include: {
      student: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, code_country: true },
          },
        },
      },
      teacher: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, code_country: true },
          },
        },
      },
      subject: true,
      groupStudents: {
        include: {
          student: {
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true, code_country: true },
              },
            },
          },
        },
      },
    },
  });

  return successResponse({
    res,
    req,
    data: {
      schedule: formatSchedules(fullSchedule || newSchedule, req.timezone),
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
    studentIds = [],
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
    sessions = [],
    customSessions = [],
    maxStudents = "1",
  } = req.body;
  const skipedSchedules = [];
  const perSessionUnits = 1;
  const effectiveStudentIds = Array.from(
    new Set([studentId, ...studentIds].filter(Boolean))
  );

  if (effectiveStudentIds.length === 0) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    const unauthorized = effectiveStudentIds.find(
      (id) => !assignedStudentIds.includes(id),
    );
    if (unauthorized) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "FORBIDDEN",
      });
    }
  }

  const isGroup =
    effectiveStudentIds.length > 1 ? true : Boolean(req.body.isGroup);

  /* check exist student, teacher, subject */
  const [students, teacher, subject] = await Promise.all([
    db.findMany({
      model: "student",
      where: { id: { in: effectiveStudentIds } },
      include: { plan: true, user: true },
    }),
    checkExist({ model: "teacher", where: { id: teacherId }, next }),
    checkExist({ model: "subjects", where: { id: subject_id }, next }),
  ]);

  const student =
    students.find((s) => s.id === (studentId || effectiveStudentIds[0])) ||
    students[0];

  if (!students.length || !student) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  let normalizedMaxStudents =
    maxStudents === "0" || maxStudents === 0 || maxStudents === "unlimited"
      ? "unlimited"
      : String(maxStudents);

  if (isGroup && normalizedMaxStudents !== "unlimited") {
    const max = parseInt(normalizedMaxStudents, 10);
    if (!isNaN(max) && effectiveStudentIds.length > max) {
      if (req.body.maxStudents !== undefined) {
        return errorResponse({
          req,
          next,
          status: 400,
          message: "EXCEEDED_MAX_STUDENTS",
        });
      } else {
        normalizedMaxStudents = String(effectiveStudentIds.length);
      }
    }
  }

  let sessionItems = [];

  if (Array.isArray(sessions) && sessions.length > 0) {
    sessionItems = sessions.map((item, i) => {
      let start_time;
      let sessionDate;

      if (item.start_time) {
        start_time = new Date(item.start_time);
        sessionDate = start_time;
      } else {
        sessionDate = new Date(item.date);
        const itemStartTime = item.startTime || timeStart;
        start_time = combineDateAndTime(sessionDate, itemStartTime, req.timezone);
      }

      const end_time = getEndTime({
        startTime: start_time,
        duration: student.plan?.sessionTime,
        tz: req.timezone,
      });

      return { date: sessionDate, start_time, end_time };
    });
  } else {
    // Fallback: auto generate from startDate, endDate/count, days
    const minRemaining = Math.min(
      ...students.map((s) => s.sessions_remaining || 0)
    );
    const effectiveCount = count || (endDate ? null : minRemaining);
    let dates = getDatesBetweenUTC(startDate, endDate, days, effectiveCount);

    sessionItems = dates.map((d, i) => {
      const dateStr = dayjs.tz(d, req.timezone).format("YYYY-MM-DD");
      const override = customSessions.find(
        (c) =>
          (c.date && c.date === dateStr) ||
          (c.index !== undefined && c.index === i)
      );

      const sessionDate = override?.newDate ? new Date(override.newDate) : d;
      const sessionStartTime = override?.startTime || timeStart;

      const start_time = combineDateAndTime(
        sessionDate,
        sessionStartTime,
        req.timezone
      );
      const end_time = getEndTime({
        startTime: start_time,
        duration: student.plan?.sessionTime,
        tz: req.timezone,
      });

      return { date: sessionDate, start_time, end_time };
    });
  }

  // Session check for recurring: Cap sessionItems to minimum remaining sessions across enrolled students
  const minRemainingSessions = Math.min(
    ...students.map((s) => s.sessions_remaining || 0)
  );

  if (sessionItems.length > minRemainingSessions) {
    sessionItems = sessionItems.slice(
      0,
      Math.floor(minRemainingSessions / perSessionUnits)
    );
  }

  if (sessionItems.length === 0) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "INSUFFICIENT_SESSIONS_OR_INVALID_RANGE",
      messageParams: {
        remaining: minRemainingSessions,
      },
    });
  }

  const createdSchedules = [];
  const schedulesToCreate = [];
  const notificationJobs = [];
  const parentRecurringId = `rec_${nanoid(10)}`;

  // Determine the overall window for the batch conflict query
  const windowStart = new Date(
    Math.min(...sessionItems.map((s) => s.start_time.getTime()))
  );
  const windowEnd = new Date(
    Math.max(...sessionItems.map((s) => s.end_time.getTime()))
  );

  // Fetch candidate existing schedules in window for conflict check
  const candidateSchedules = await db.findMany({
    model: "schedule",
    where: {
      status: { not: "cancelled" },
      start_time: { lt: windowEnd },
      end_time: { gt: windowStart },
      OR: [
        { teacherId },
        { studentId: { in: effectiveStudentIds } },
        { groupStudents: { some: { studentId: { in: effectiveStudentIds } } } },
      ],
    },
    include: {
      groupStudents: true,
    },
  });

  const nowsessions = getNowUTC().toDate();

  for (let i = 0; i < sessionItems.length; i++) {
    const { start_time, end_time } = sessionItems[i];

    if (start_time < nowsessions) {
      skipedSchedules.push({
        date: sessionItems[i].date,
        reason: "CANNOT_CREATE_SESSION_IN_PAST",
      });
      continue;
    }

    const hasConflict = candidateSchedules.some(
      (existing) =>
        existing.start_time < end_time && existing.end_time > start_time
    );

    if (hasConflict) {
      skipedSchedules.push({
        date: sessionItems[i].date,
        reason: "SESSION_CONFLICT",
      });
      continue;
    }

    const customNotifTime = customSessions.find(
      (c) => c.index === i || (c.date && c.date === sessionItems[i].date)
    )?.notification_Time;

    const recurringScheduleId = crypto.randomUUID();
    schedulesToCreate.push({
      scheduleData: {
        id: recurringScheduleId,
        studentId: isGroup ? null : studentId || effectiveStudentIds[0],
        teacherId,
        title,
        description,
        link: link || teacher?.meeting_link || buildJitsiRoomUrl(recurringScheduleId),
        notes,
        subjectId: subject_id,
        start_time,
        end_time,
        parent_recurring_id: parentRecurringId,
        isGroup,
        maxStudents: isGroup ? normalizedMaxStudents : "1",
      },
      notification_Time: customNotifTime || notification_Time,
      index: i,
    });

    candidateSchedules.push({
      teacherId,
      studentId: isGroup ? null : studentId || effectiveStudentIds[0],
      start_time,
      end_time,
    });
  }

  if (schedulesToCreate.length > 0) {
    await db.transaction(async (tx) => {
      for (const { scheduleData, notification_Time: nt, index } of schedulesToCreate) {
        const schedule = await tx.create({
          model: "schedule",
          data: scheduleData,
        });

        await tx.create({
          model: "scheduleLog",
          data: {
            scheduleId: schedule.id,
          },
        });

        notificationJobs.push({
          scheduleId: schedule.id,
          start_time: scheduleData.start_time,
          notification_Time: nt,
          index,
        });

        for (const sId of effectiveStudentIds) {
          if (isGroup) {
            await tx.create({
              model: "GroupScheduleStudent",
              data: {
                scheduleId: schedule.id,
                studentId: sId,
              },
            });
          }

          await tx.upsertOne({
            model: "student_teacher",
            where: { studentId_teacherId: { studentId: sId, teacherId } },
            update: {},
            create: { studentId: sId, teacherId, hour_price: teacher?.hour_price ?? 0 },
          });

          await tx.updateOne({
            model: "student",
            where: { id: sId },
            data: {
              sessions_remaining: {
                decrement: perSessionUnits,
              },
            },
          });
        }

        createdSchedules.push({
          id: schedule.id,
          date: scheduleData.start_time.toISOString().split("T")[0],
          start_time: scheduleData.start_time.toISOString(),
        });
      }
    });

    // Queue notification jobs after successful transaction
    const now = new Date();
    for (const {
      scheduleId,
      start_time: st,
      notification_Time: nt,
      index,
    } of notificationJobs) {
      let reminderTime;
      let notificationJobType;
      if (nt === notificationType[1]) {
        reminderTime = new Date(st.getTime() - 10 * 60 * 1000);
        notificationJobType = "before 10 minutes";
      } else if (nt === notificationType[2]) {
        reminderTime = new Date(st.getTime() - 30 * 60 * 1000);
        notificationJobType = "before 30 minutes";
      } else if (nt === notificationType[3]) {
        reminderTime = new Date(st.getTime() - 60 * 60 * 1000);
        notificationJobType = "before 60 minutes";
      } else {
        reminderTime = new Date(st.getTime() - 5 * 60 * 1000);
        notificationJobType = "before 5 minutes";
      }
      if (reminderTime > now) {
        addNotificationJob({
          scheduleId: scheduleId,
          studentId: studentId || effectiveStudentIds[0],
          type: notificationJobType,
          sendAt: reminderTime,
        });
      }
    }
  }

  if (createdSchedules.length > 0) {
    const teacherInfo = await db.findOne({
      model: "teacher",
      where: { id: teacherId },
      include: { user: true },
    });

    const teacherName = teacherInfo?.user?.name || "Teacher";
    const studentNames =
      students.map((s) => s.user?.name || "Student").join(", ") || "Student";

    const notificationPromises = students
      .filter((s) => s.user?.id)
      .map((s) =>
        createTeacherAndStudentNotification({
          title: "تم جدولة الجلسة",
          message: `تم جدولة ${createdSchedules.length} جلسة جديدة "${title}" للطالب: ${s.user?.name || "Student"} مع المدرس: ${teacherName}.`,
          type: "session_created",
          teacherId: teacherInfo?.user?.id,
          studentId: s.user.id,
        })
      );

    notificationPromises.push(
      createAdminNotification({
        title: "تم جدولة الجلسات المتكررة",
        message: `تم جدولة ${createdSchedules.length} جلسات متكررة للطالب: ${studentNames} مع المدرس: ${teacherName}.`,
        type: "session_created",
      })
    );

    await Promise.all(notificationPromises);
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


export const syncSessionStatuses = asyncHandler(async (req, res, next) => {
  const now = new Date();

  // Find all active/pending sessions that need status evaluation
  const activeSessions = await db.findMany({
    model: "schedule",
    where: {
      status: { in: ["scheduled", "planned", "ongoing"] },
    },
    include: {
      scheduleLogs: true,
      student: { include: { user: true } },
      groupStudents: { include: { student: { include: { user: true } } } },
      teacher: { include: { user: true } },
    },
  });

  let updatedCount = 0;
  let finalizedCount = 0;
  let ongoingCount = 0;

  for (const session of activeSessions) {
    const isPast = new Date(session.end_time) <= now;
    const isCurrent =
      new Date(session.start_time) <= now && new Date(session.end_time) > now;

    if (isPast) {
      if (session.status !== "completed" && session.status !== "missed") {
        await finalizeSession(session.id, req.t);
        updatedCount++;
        finalizedCount++;
      }
    } else if (isCurrent) {
      if (session.status === "scheduled" || session.status === "planned") {
        const log = Array.isArray(session.scheduleLogs)
          ? session.scheduleLogs[0]
          : session.scheduleLogs;

        const anyGroupStudentJoined =
          session.isGroup &&
          session.groupStudents?.some(
            (gs) => gs.isAttended || Boolean(gs.joinTime),
          );

        const anyJoined = Boolean(
          log?.joinTime_teacher ||
            log?.joinTime_student ||
            anyGroupStudentJoined,
        );

        if (anyJoined) {
          await db.updateOne({
            model: "schedule",
            where: { id: session.id },
            data: { status: "ongoing" },
          });
          updatedCount++;
          ongoingCount++;
        }
      }
    }
  }

  return successResponse({
    res,
    req,
    status: 200,
    message: "STATUSES_SYNCED_SUCCESSFULLY",
    data: {
      processed: activeSessions.length,
      updated: updatedCount,
      finalizedCount,
      ongoingCount,
    },
  });
});

/* ------------------------------------------------------------------ */
/*             Get all schedules (teacher dashboard / admin)            */
/* ------------------------------------------------------------------ */
export const getUserSchedules = asyncHandler(async (req, res, next) => {
  const { user } = req;
  const {
    status,
    search,
    start_date,
    end_date,
    isGroup,
    teacherId,
    studentId,
    subjectId,
  } = req.query;

  const where = {};

  if (status) where.status = status;
  if (isGroup !== undefined) where.isGroup = isGroup === "true";
  if (subjectId) where.subjectId = subjectId;

  const userRole = user.role?.name?.toLowerCase();

  // Role-based scoping
  if (userRole === "teacher") {
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
  } else if (userRole === "student") {
    const student = user.student;
    if (!student) {
      return errorResponse({
        req,
        next,
        status: 404,
        message: "STUDENT_NOT_FOUND",
      });
    }
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { studentId: student.id },
        { groupStudents: { some: { studentId: student.id } } },
      ],
    });
  } else if (userRole === "moderator") {
    const assignedStudentIds = await getModeratorStudentIds(user);
    where.AND = where.AND || [];
    where.AND.push(buildStudentScheduleFilter(assignedStudentIds, studentId));
    if (teacherId) where.teacherId = teacherId;
  } else {
    // Admin / Staff role: allow optional teacherId or studentId query filters
    if (teacherId) where.teacherId = teacherId;
    if (studentId) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { studentId: studentId },
          { groupStudents: { some: { studentId: studentId } } },
        ],
      });
    }
  }

  // 📅 Date range filtering
  if (start_date && end_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
      lte: normalizeDate(end_date, req.timezone),
    };
  } else if (start_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
    };
  } else if (end_date) {
    where.start_time = {
      lte: normalizeDate(end_date, req.timezone),
    };
  }

  if (search) {
    where.AND = where.AND || [];
    if (userRole === "teacher") {
      where.AND.push({
        OR: [
          { student: { user: { name: { contains: search, mode: "insensitive" } } } },
          { groupStudents: { some: { student: { user: { name: { contains: search, mode: "insensitive" } } } } } },
        ],
      });
    } else if (userRole === "student") {
      where.AND.push({
        teacher: {
          user: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      });
    } else {
      where.AND.push({
        OR: [
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
          {
            groupStudents: {
              some: {
                student: {
                  user: { name: { contains: search, mode: "insensitive" } },
                },
              },
            },
          },
        ],
      });
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
      subject: true,
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
/*                  Get schedules for a specific teacher              */
/* ------------------------------------------------------------------ */
export const getTeacherSchedules = asyncHandler(async (req, res, next) => {
  const teacherId = req.params.teacherId || req.query.teacherId;
  const { status, search, start_date, end_date, page, limit } = req.query;

  const where = { teacherId };
  if (status) where.status = status;

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    where.AND = where.AND || [];
    where.AND.push(buildStudentScheduleFilter(assignedStudentIds));
  }

  if (start_date && end_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
      lte: normalizeDate(end_date, req.timezone),
    };
  } else if (start_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
    };
  } else if (end_date) {
    where.start_time = {
      lte: normalizeDate(end_date, req.timezone),
    };
  }

  if (search) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { student: { user: { name: { contains: search, mode: "insensitive" } } } },
        { groupStudents: { some: { student: { user: { name: { contains: search, mode: "insensitive" } } } } } },
      ],
    });
  }

  const includeConfig = {
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
    subject: true,
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
  };

  if (page && limit) {
    const { items: schedules, pagination } = await db.findManyWithPaginationAndCount({
      model: "schedule",
      where,
      page: Number(page),
      limit: Number(limit),
      orderBy: { start_time: "asc" },
      include: includeConfig,
    });

    const formattedSchedules = formatSchedules(schedules, req.timezone);

    return successResponse({
      res,
      req,
      status: 200,
      message: "FETCH_SUCCESS",
      data: { schedules: formattedSchedules, pagination },
    });
  }

  const schedules = await db.findMany({
    model: "schedule",
    where,
    include: includeConfig,
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
/*                  Get schedules for a specific student              */
/* ------------------------------------------------------------------ */
export const getStudentSchedules = asyncHandler(async (req, res, next) => {
  const studentId = req.params.studentId || req.query.studentId;
  const { status, search, start_date, end_date, page, limit } = req.query;

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null && !assignedStudentIds.includes(studentId)) {
    return errorResponse({
      req,
      next,
      status: 403,
      message: "FORBIDDEN",
    });
  }

  const where = {
    OR: [
      { studentId },
      { groupStudents: { some: { studentId } } },
    ],
  };

  if (status) where.status = status;

  if (start_date && end_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
      lte: normalizeDate(end_date, req.timezone),
    };
  } else if (start_date) {
    where.start_time = {
      gte: normalizeDate(start_date, req.timezone),
    };
  } else if (end_date) {
    where.start_time = {
      lte: normalizeDate(end_date, req.timezone),
    };
  }

  if (search) {
    where.AND = where.AND || [];
    where.AND.push({
      teacher: {
        user: {
          name: { contains: search, mode: "insensitive" },
        },
      },
    });
  }

  const includeConfig = {
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
    subject: true,
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
  };

  if (page && limit) {
    const { items: schedules, pagination } = await db.findManyWithPaginationAndCount({
      model: "schedule",
      where,
      page: Number(page),
      limit: Number(limit),
      orderBy: { start_time: "asc" },
      include: includeConfig,
    });

    const formattedSchedules = formatSchedules(schedules, req.timezone);

    return successResponse({
      res,
      req,
      status: 200,
      message: "FETCH_SUCCESS",
      data: { schedules: formattedSchedules, pagination },
    });
  }

  const schedules = await db.findMany({
    model: "schedule",
    where,
    include: includeConfig,
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
    include: {
      groupStudents: {
        include: {
          student: { include: { user: true } },
        },
      },
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
  });

  if (!schedule) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "SESSION_NOT_FOUND",
    });
  }

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    const sessionStudentIds = schedule.isGroup
      ? schedule.groupStudents.map((gs) => gs.studentId)
      : schedule.studentId
      ? [schedule.studentId]
      : [];
    const hasUnauthorizedStudent = sessionStudentIds.some(
      (sid) => !assignedStudentIds.includes(sid),
    );
    if (hasUnauthorizedStudent || sessionStudentIds.length === 0) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "FORBIDDEN",
      });
    }
  }

  // Removal job from BullMQ
  await removeNotificationJob(id);

  const students = schedule.isGroup
    ? schedule.groupStudents.map((gs) => gs.student).filter(Boolean)
    : schedule.student
    ? [schedule.student]
    : [];

  // 🛡️ Use transaction to ensure refund and deletion happen together
  await db.transaction(async (tx) => {
    // Refund sessions if it wasn't already cancelled
    if (schedule.status !== "cancelled") {
      const refundSessions = 1;
      for (const student of students) {
        await tx.updateOne({
          model: "student",
          where: { id: student.id },
          data: { sessions_remaining: { increment: refundSessions } },
        });
      }
    }

    // Delete from DB
    await tx.deleteOne({
      model: "schedule",
      where: { id: id },
    });

    // Cleanup student_teacher link if no more sessions exist between this pair
    for (const student of students) {
      const remainingSession = await tx.findFirst({
        model: "schedule",
        where: {
          teacherId: schedule.teacherId,
          id: { not: id },
          OR: [
            { studentId: student.id },
            { groupStudents: { some: { studentId: student.id } } },
          ],
        },
      });
      if (!remainingSession) {
        await tx.deleteMany({
          model: "student_teacher",
          where: { studentId: student.id, teacherId: schedule.teacherId },
        });
      }
    }
  });

  const teacherUserId = schedule.teacher?.user?.id;
  const teacherName = schedule.teacher?.user?.name || "Teacher";
  const studentNames =
    students.map((s) => s.user?.name || "Student").join(", ") || "Student";

  const notificationPromises = students
    .filter((s) => s.user?.id)
    .map((s) =>
      createTeacherAndStudentNotification({
        title: "تم إلغاء الجلسة",
        message: `تم إلغاء الجلسة "${schedule.title}" للطالب: ${s.user?.name || "Student"} مع المدرس: ${teacherName}.`,
        type: "session_cancelled",
        teacherId: teacherUserId,
        studentId: s.user.id,
      })
    );

  notificationPromises.push(
    createAdminNotification({
      title: "تم إلغاء الجلسة",
      message: `تم إلغاء الجلسة "${schedule.title}" للطالب: ${studentNames} مع المدرس: ${teacherName}.`,
      type: "session_cancelled",
    })
  );

  await Promise.all(notificationPromises);

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
    include: {
      groupStudents: {
        include: {
          student: { include: { user: true } },
        },
      },
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
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

  // Calculate session refunds per student for sessions that weren't already cancelled
  const studentRefunds = new Map(); // studentId -> { student, count }
  const allStudentsMap = new Map(); // studentId -> student

  for (const sched of schedules) {
    const schedStudents = sched.isGroup
      ? sched.groupStudents.map((gs) => gs.student).filter(Boolean)
      : sched.student
      ? [sched.student]
      : [];

    for (const student of schedStudents) {
      allStudentsMap.set(student.id, student);
      if (sched.status !== "cancelled") {
        if (!studentRefunds.has(student.id)) {
          studentRefunds.set(student.id, { student, count: 0 });
        }
        studentRefunds.get(student.id).count += 1;
      }
    }
  }

  const teacher = schedules[0]?.teacher;
  const teacherId = schedules[0]?.teacherId;

  // 🛡️ Use transaction to ensure refund and mass deletion happen together
  await db.transaction(async (tx) => {
    for (const [studentId, { count }] of studentRefunds.entries()) {
      if (count > 0) {
        await tx.updateOne({
          model: "student",
          where: { id: studentId },
          data: { sessions_remaining: { increment: count } },
        });
      }
    }

    // Delete all sessions in this recurring group
    await tx.deleteMany({
      model: "schedule",
      where: { parent_recurring_id },
    });

    // Cleanup student_teacher link if no other sessions exist between pair
    if (teacherId) {
      for (const studentId of allStudentsMap.keys()) {
        const remainingSession = await tx.findFirst({
          model: "schedule",
          where: {
            teacherId,
            parent_recurring_id: { not: parent_recurring_id },
            OR: [
              { studentId: studentId },
              { groupStudents: { some: { studentId: studentId } } },
            ],
          },
        });
        if (!remainingSession) {
          await tx.deleteMany({
            model: "student_teacher",
            where: {
              studentId,
              teacherId,
            },
          });
        }
      }
    }
  });

  const teacherUserId = teacher?.user?.id;
  const teacherName = teacher?.user?.name || "Teacher";
  const studentNames =
    Array.from(allStudentsMap.values())
      .map((s) => s.user?.name || "Student")
      .join(", ") || "Student";

  const notificationPromises = Array.from(allStudentsMap.values())
    .filter((s) => s.user?.id)
    .map((s) =>
      createTeacherAndStudentNotification({
        title: "تم إلغاء الجلسات المتكررة",
        message: `تم إلغاء جميع الجلسات المتكررة للطالب: ${s.user?.name || "Student"} مع المدرس: ${teacherName}.`,
        type: "session_cancelled",
        teacherId: teacherUserId,
        studentId: s.user.id,
      })
    );

  notificationPromises.push(
    createAdminNotification({
      title: "تم إلغاء الجلسات المتكررة",
      message: `تم إلغاء جميع الجلسات المتكررة تحت المجموعة "${parent_recurring_id}" للطلاب: ${studentNames} مع المدرس: ${teacherName}.`,
      type: "session_cancelled",
    })
  );

  await Promise.all(notificationPromises);

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
    include: {
      student: { include: { plan: true, user: true } },
      groupStudents: { include: { student: { include: { plan: true, user: true } } } },
      teacher: { include: { user: true } },
    },
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

  const students = schedule.isGroup
    ? schedule.groupStudents.map((gs) => gs.student).filter(Boolean)
    : schedule.student
    ? [schedule.student]
    : [];

  const targetStudentIds = students.map((s) => s.id);

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    const hasUnauthorizedStudent = targetStudentIds.some(
      (sid) => !assignedStudentIds.includes(sid),
    );
    if (hasUnauthorizedStudent || targetStudentIds.length === 0) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "FORBIDDEN",
      });
    }
    if (req.body.studentId && !assignedStudentIds.includes(req.body.studentId)) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "FORBIDDEN",
      });
    }
  }

  // If time or type changes, recalculate end time and check conflicts
  if (start_time) {
    const studentPlan =
      schedule.student?.plan || schedule.groupStudents?.[0]?.student?.plan;
    startTime = start_time
      ? normalizeDate(start_time, req.timezone)
      : startTime;
    endTime = getEndTime({
      startTime,
      duration: studentPlan?.sessionTime,
      tz: req.timezone,
    });

    updateData.start_time = startTime;
    updateData.end_time = endTime;
    scheduleUpdated = true;

    // Conflict check
    const teacher_conflict = await db.findFirst({
      model: "schedule",
      where: {
        teacherId: schedule.teacherId,
        id: { not: id },
        status: { not: "cancelled" },
        start_time: { lt: endTime },
        end_time: { gt: startTime },
      },
    });
    const student_conflict =
      targetStudentIds.length > 0
        ? await db.findFirst({
            model: "schedule",
            where: {
              id: { not: id },
              status: { not: "cancelled" },
              start_time: { lt: endTime },
              end_time: { gt: startTime },
              OR: [
                { studentId: { in: targetStudentIds } },
                {
                  groupStudents: {
                    some: { studentId: { in: targetStudentIds } },
                  },
                },
              ],
            },
          })
        : null;

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
      for (const student of students) {
        await db.updateOne({
          model: "student",
          where: { id: student.id },
          data: { sessions_remaining: { increment: sessionUnits } },
        });
      }
    } else if (schedule.status === "cancelled") {
      // Restoring: Deduct
      const insufficientStudent = students.find(
        (s) => s.sessions_remaining < sessionUnits
      );
      if (insufficientStudent) {
        return errorResponse({
          req,
          next,
          status: 400,
          message: "INSUFFICIENT_SESSIONS_RESTORE",
        });
      }
      for (const student of students) {
        await db.updateOne({
          model: "student",
          where: { id: student.id },
          data: { sessions_remaining: { decrement: sessionUnits } },
        });
      }
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

    // Only add a new job if the session is still "planned" or "scheduled"
    const currentStatus = otherData.status || updatedSchedule.status;
    if (currentStatus === "planned" || currentStatus === "scheduled") {
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
          studentId: schedule.studentId || targetStudentIds[0],
          type: notificationJobType,
          sendAt: reminderTime,
        });
      }
    }
  }

  const teacherUserId = schedule.teacher?.user?.id;
  const teacherName = schedule.teacher?.user?.name || "Teacher";
  const studentNames =
    students.map((s) => s.user?.name || "Student").join(", ") || "Student";

  const notificationPromises = students
    .filter((s) => s.user?.id)
    .map((s) =>
      createTeacherAndStudentNotification({
        title: "تم تعديل الجلسة",
        message: `تم تعديل الجلسة "${schedule.title}" للطالب: ${s.user?.name || "Student"} مع المدرس: ${teacherName}. الي المعاد الجديد ${startTime} - ${endTime}`,
        type: "session_updated",
        teacherId: teacherUserId,
        studentId: s.user.id,
      })
    );

  notificationPromises.push(
    createAdminNotification({
      title: "تم تعديل الجلسة",
      message: `تم تعديل الجلسة "${schedule.title}" للطالب: ${studentNames} مع المدرس: ${teacherName}.`,
      type: "session_updated",
    })
  );

  await Promise.all(notificationPromises);

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

  const settings = await getSettingsData();
  

  const session = await db.findOne({
    model: "schedule",
    where: { id },
    include: {
      student: { include: { user: true } },
      groupStudents: { include: { student: { include: { user: true } } } },
      teacher: { include: { user: true } },
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
  if (role === "student") {
    const student = await db.findOne({
      model: "student",
      where: { user_id: user.id },
    });

    if (!student) {
      return errorResponse({
        req,
        next,
        status: 404,
        message: "STUDENT_NOT_FOUND",
      });
    }
   
    

    if (
      student.paid === studentPaidStatus.Unpaid &&
      settings?.studentCanJoin === false
    ) {
      return errorResponse({
        req,
        next,
        status: 400,
        message: "STUDENT_MUST_PAY",
      });
    }
  }
  
  




  if (session.status === "cancelled") {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "SESSION_CANCELLED",
    });
  }

  // 1. Check if it's too early (UTC comparison)
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

  // 2. Check if it's already finished (UTC comparison)
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
  if (role === "student") {
    updateData.joinTime_student = nowUTC;
    updateData.isStudentAttended = true;

    if (session.isGroup) {
      const studentRecord = await db.findFirst({
        model: "student",
        where: { user_id: user.id },
      });
      if (studentRecord) {
        await db.updateOne({
          model: "GroupScheduleStudent",
          where: {
            scheduleId_studentId: {
              scheduleId: id,
              studentId: studentRecord.id,
            },
          },
          data: {
            joinTime: nowUTC,
            isAttended: true,
            status: "attended",
          },
        });
      }
    }
  } else if (role === "teacher") {
    updateData.joinTime_teacher = nowUTC;
    const diffMinutes =
      (nowUTC.getTime() - session.start_time.getTime()) / (60 * 1000);
    const isLate = diffMinutes > 0;
    if (isLate) {
      updateData.isTeacherLate = true;
      // Notify Admin
      await createNotification({
        userId: "admin",
        title: req.t("NOTIFICATION_TEACHER_LATE_TITLE"),
        message: req.t("NOTIFICATION_TEACHER_LATE_MSG", { id }),
        type: "teacher_late",
      });
    }
  }

  await db.updateOne({
    model: "scheduleLog",
    where: { id: log.id },
    data: updateData,
  });

  if (session.status === "scheduled" || session.status === "planned") {
    await db.updateOne({
      model: "schedule",
      where: { id },
      data: { status: "ongoing" },  
    });
  }

  // Notify other party
  if (role === "student") {
    if (session.teacher?.user?.id) {
      await createNotification({
        userId: session.teacher.user.id,
        title: req.t("NOTIFICATION_SESSION_JOINED_TITLE"),
        message: req.t("NOTIFICATION_SESSION_JOINED_MSG", {
          role: req.t("STUDENT"),
        }),
        type: "session_joined",
      });
    }
  } else if (role === "teacher") {
    const studentsToNotify = session.isGroup
      ? session.groupStudents?.map((gs) => gs.student).filter(Boolean) || []
      : session.student
      ? [session.student]
      : [];

    for (const st of studentsToNotify) {
      if (st?.user?.id) {
        await createNotification({
          userId: st.user.id,
          title: req.t("NOTIFICATION_SESSION_JOINED_TITLE"),
          message: req.t("NOTIFICATION_SESSION_JOINED_MSG", {
            role: req.t("TEACHER"),
          }),
          type: "session_joined",
        });
      }
    }
  }

  // Generate Jitsi Meeting Data
  const isModerator = role === "teacher" || ["admin", "super_admin"].includes(role);
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

  if (role === "student") {
    if (session.isGroup) {
      const studentRecord = await db.findFirst({
        model: "student",
        where: { user_id: user.id },
      });
      if (studentRecord) {
        const groupStudent = await db.findFirst({
          model: "GroupScheduleStudent",
          where: { scheduleId: id, studentId: studentRecord.id },
        });
        if (!groupStudent?.joinTime)
          return errorResponse({ req, next, status: 400, message: "NEVER_JOINED" });
        const duration = (nowUTC - groupStudent.joinTime) / 60000;
        await db.updateOne({
          model: "GroupScheduleStudent",
          where: { id: groupStudent.id },
          data: {
            leaveTime: nowUTC,
            duration,
          },
        });
      }
    } else {
      if (!log.joinTime_student)
        return errorResponse({ req, next, status: 400, message: "NEVER_JOINED" });
      updateData.leaveTime_student = nowUTC;
      const duration = (nowUTC - log.joinTime_student) / 60000;
      updateData.duration_student = duration;
    }
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
    // Check if both have left
    const updatedLog = await db.findFirst({
      model: "scheduleLog",
      where: { id: log.id },
    });
    if (updatedLog.leaveTime_student && updatedLog.leaveTime_teacher) {
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
      groupStudents: { include: { student: { include: { user: true } } } },
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

  const isTeacher = user.id === session.teacher?.user?.id;
  const isIndividualStudent = user.id === session.student?.user?.id;
  const groupStudentMatch = session.isGroup
    ? session.groupStudents.find((gs) => gs.student?.user?.id === user.id)
    : null;
  const isStudent = isIndividualStudent || Boolean(groupStudentMatch);

  if (!isStudent && !isTeacher) {
    return errorResponse({
      req,
      next,
      status: 403,
      message: "NOT_A_PARTICIPANT",
    });
  }

  let log = Array.isArray(session.scheduleLogs)
    ? session.scheduleLogs[0]
    : session.scheduleLogs;

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

  const studentActuallyAttended = session.isGroup
    ? Boolean(groupStudentMatch?.isAttended || groupStudentMatch?.joinTime)
    : Boolean(log.joinTime_student);

  // Absent student cannot submit a review
  if (isStudent && !studentActuallyAttended) {
    return errorResponse({
      req,
      next,
      status: 400,
      message: "ABSENT_STUDENT_CANNOT_REVIEW",
    });
  }

  // Absent teacher cannot submit a review
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
    : session.student?.user?.id || session.groupStudents?.[0]?.student?.user?.id;

  const role = isStudent ? "student" : "teacher";

  let review;

  // Ensure session is finalized/settled before saving review
  if (log.leaveTime_student && log.leaveTime_teacher) {
    await finalizeSession(id, req.t);
  }

  await db.transaction(async (tx) => {
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

  if (revieweeId) {
    await updateAverageRating(revieweeId);

    await createNotification({
      userId: revieweeId,
      title: req.t("NOTIFICATION_REVIEW_RECEIVED_TITLE"),
      message: req.t("NOTIFICATION_REVIEW_RECEIVED_MSG", { rating }),
      type: "review_received",
    });
  }

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
      student: { include: { user: true } },
      groupStudents: { include: { student: { include: { user: true } } } },
      teacher: { include: { user: true } },
    },
  });

  if (!session || session.status === "completed" || session.status === "missed")
    return;

  const log = Array.isArray(session.scheduleLogs)
    ? session.scheduleLogs[0]
    : session.scheduleLogs;

  const teacherActuallyAttended = log
    ? log.isTeacherCompleted === true || Boolean(log.joinTime_teacher)
    : false;

  const studentActuallyAttended = log
    ? Boolean(log.joinTime_student)
    : false;

  const finalStudents = session.isGroup
    ? session.groupStudents.map((gs) => gs.student).filter(Boolean)
    : session.student
    ? [session.student]
    : [];

  const attendedStudents = [];
  const absentStudents = [];

  if (session.isGroup) {
    for (const gs of session.groupStudents) {
      if (gs.isAttended || gs.joinTime) {
        if (gs.student) attendedStudents.push(gs.student);
      } else {
        absentStudents.push(gs);
      }
    }
  } else {
    if (studentActuallyAttended && session.student) {
      attendedStudents.push(session.student);
    } else if (session.student) {
      absentStudents.push({ student: session.student });
    }
  }

  await db.transaction(async (tx) => {
    if (log && log.isStudentAttended !== studentActuallyAttended) {
      await tx.updateOne({
        model: "scheduleLog",
        where: { id: log.id },
        data: { isStudentAttended: studentActuallyAttended },
      });
    }

    if (!teacherActuallyAttended) {
      // Teacher absent => refund all enrolled students
      for (const st of finalStudents) {
        await tx.updateOne({
          model: "student",
          where: { id: st.id },
          data: {
            sessions_remaining: { increment: 1 },
          },
        });
      }

      // Mark group students status as missed
      if (session.isGroup) {
        for (const gs of session.groupStudents) {
          await tx.updateOne({
            model: "GroupScheduleStudent",
            where: { id: gs.id },
            data: { status: "missed" },
          });
        }
      }

      await tx.updateOne({
        model: "schedule",
        where: { id: scheduleId },
        data: {
          status: "missed",
        },
      });
    } else {
      // Teacher attended => calculate payout
      const sessionDuration =
        (session.end_time - session.start_time) / (60 * 1000 * 60);

      let effectiveRate = 0;
      if (session.isGroup) {
        // Group Session: Calculate rate from teacher.group_hour_price
        effectiveRate =
          session.teacher.group_hour_price || session.teacher.hour_price || 0;
      } else {
        // 1-on-1 Session: Calculate rate from student_teacher model for (studentId, teacherId)
        let stLink = null;
        if (session.studentId && session.teacherId) {
          stLink = await tx.findOne({
            model: "student_teacher",
            where: {
              studentId_teacherId: {
                studentId: session.studentId,
                teacherId: session.teacherId,
              },
            },
          });
        }
        effectiveRate =
          stLink && stLink.hour_price > 0
            ? stLink.hour_price
            : session.teacher.hour_price || 0;
      }

      let payoutAmount = sessionDuration * effectiveRate;

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
        where: { id: scheduleId },
        data: {
          status: "completed",
        },
      });

      const settings = await tx.findFirst({
        model: "setting",
      });

      // Update attendance status for each group student record
      if (session.isGroup) {
        for (const gs of session.groupStudents) {
          const isAtt = gs.isAttended || Boolean(gs.joinTime);
          await tx.updateOne({
            model: "GroupScheduleStudent",
            where: { id: gs.id },
            data: {
              isAttended: isAtt,
              status: isAtt ? "attended" : "missed",
            },
          });
        }
      }

      // Increment attended sessions and points only for attended students
      for (const st of attendedStudents) {
        await tx.updateOne({
          model: "student",
          where: { id: st.id },
          data: {
            sessions_attended: { increment: 1 },
            points: { increment: 10 },
            ...(settings?.paidSessionCount &&
            (st.sessions_attended || 0) + 1 >= settings.paidSessionCount
              ? { paid: studentPaidStatus.Unpaid }
              : undefined),
          },
        });
      }
    }
  });

  // Check & update rank for attended students
  for (const st of attendedStudents) {
    await checkAndUpdateStudentRank(st.id);
  }

  const finalStatus = teacherActuallyAttended ? "completed" : "missed";

  // Notify if teacher missed
  if (finalStatus === "missed") {
    await Promise.all([
      createTeacherAndStudentNotification({
        title: t ? t("NOTIFICATION_SESSION_MISSED_TITLE") : "Session Missed",
        message: t
          ? t("NOTIFICATION_SESSION_MISSED_MSG", { title: session.title })
          : `The session ${session.title} was marked as missed.`,
        type: "session_missed",
        teacherId: session.teacher.user?.id,
        studentId: session.student?.user?.id,
      }),
      createAdminNotification({
        title: "تم تفويت الجلسة",
        message: `تم تفويت الجلسة "${session.title}" بسبب غياب المدرس: ${session.teacher.user?.name || "المعلم"}.`,
        type: "session_missed",
      }),
    ]);
  } else {
    // Teacher attended: Notify Admin and Student for any absent students in group sessions
    if (session.isGroup) {
      for (const absentItem of absentStudents) {
        const studentUser = absentItem.student?.user;
        if (studentUser) {
          await createAdminNotification({
            title: "غياب طالب عن حصة جماعية",
            message: `غاب الطالب: ${studentUser.name} عن الحصة الجماعية "${session.title}" مع المعلم: ${session.teacher.user?.name || "المعلم"}.`,
            type: "group_student_absent",
          });

          await createNotification({
            userId: studentUser.id,
            title: "غياب عن الحصة الجماعية",
            message: `تم تسجيل غيابك عن الحصة الجماعية "${session.title}".`,
            type: "session_missed",
          });
        }
      }
    } else if (!studentActuallyAttended && session.student?.user) {
      // 1-on-1 absent student
      await createAdminNotification({
        title: "غياب طالب عن الجلسة",
        message: `غاب الطالب: ${session.student.user.name} عن الجلسة "${session.title}" مع المعلم: ${session.teacher.user?.name || "المعلم"}.`,
        type: "session_missed",
      });
    }
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
