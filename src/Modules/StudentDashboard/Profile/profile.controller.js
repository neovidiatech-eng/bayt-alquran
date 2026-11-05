import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../../Utils/Response.js";
import { decryptText, looksEncrypted } from "../../../Utils/Security/index.js";
import * as db from "../../../database/dbService.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { formatSchedules } from "../../../Utils/Date/time.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await db.findOne({
    model: "student",
    where: {
      user_id: req.user.id,
    },

    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          provider: true,
          googleId: true,
          createdAt: true,
          code_country: true,
          status: true,
          reviewsReceived: true,
        },
      },

      schedules: {
        include: {
          teacher: true,
          subject: true,
        },
      },

      plan: {
        select: {
          id: true,
          name_en: true,
          name_ar: true,
          description: true,
          price: true,
          duration: true,
          sessionsCount: true,
          features: true,
        },
      },
    },
  });
  console.log(user);

  const phoneToPhone = looksEncrypted(user.user.phone)
    ? await decryptText({ text: user.user.phone })
    : user.user.phone;
  console.log();

  const userDecrypted = {
    ...user,
    user: {
      ...user.user,
      phone: phoneToPhone,
    },
  };
  return successResponse({
    res,
    req,
    data: userDecrypted,
    status: 200,
    message: "FETCH_SUCCESS",
  });
});

export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const student = await db.findFirst({
    model: "student",
    where: { user_id: req.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      plan: {
        select: {
          id: true,
          name_en: true,
          name_ar: true,
        },
      },
    },
  });

  if (!student) {
    return errorResponse({
      next,
      req,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  const tz = req.user.timezone || "Africa/Cairo";
  const localNow = dayjs().tz(tz);
  const startOfDay = localNow.startOf("day").utc().toDate();
  const endOfDay = localNow.endOf("day").utc().toDate();

  const [
    homeworkCount,
    pendingHomeworkCount,
    examCount,
    pendingExamCount,
    courseCount,
    totalSchedulesCount,
    todaySchedules,
  ] = await Promise.all([
    db.count({
      model: "homework",
      where: { studentId: student.id },
    }),
    db.count({
      model: "homework",
      where: { studentId: student.id, status: "pending" },
    }),
    db.count({
      model: "exam",
      where: { studentId: student.id },
    }),
    db.count({
      model: "exam",
      where: { studentId: student.id, status: "pending" },
    }),
    db.count({
      model: "course",
      where: { status: "active" },
    }),
    db.count({
      model: "schedule",
      where: { studentId: student.id },
    }),
    db.findMany({
      model: "schedule",
      where: {
        studentId: student.id,
        start_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: "cancelled" },
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        subject: true,
      },
      orderBy: { start_time: "asc" },
    }),
  ]);

  const formattedTodaySchedules = formatSchedules(todaySchedules, tz);

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: {
      student: {
        id: student.id,
        user_id: student.user_id,
        name: student.user.name,
        email: student.user.email,
        active: student.active,
        gender: student.gender,
        birth_date: student.birth_date,
        country: student.country,
        status: student.status,
        plan: student.plan,
      },
      stats: {
        sessions: {
          total: student.sessions,
          attended: student.sessions_attended,
          remaining: student.sessions_remaining,
          scheduled: totalSchedulesCount,
        },
        homeworks: {
          total: homeworkCount,
          pending: pendingHomeworkCount,
        },
        exams: {
          total: examCount,
          pending: pendingExamCount,
        },
        courses: {
          total: courseCount,
        },
      },
      todaySchedules: formattedTodaySchedules,
    },
  });
});
