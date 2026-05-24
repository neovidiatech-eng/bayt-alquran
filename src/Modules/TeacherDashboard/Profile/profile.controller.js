import { getNowUTC } from "../../../Utils/Date/time.js";
import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../../Utils/Response.js";
import { decryptText, looksEncrypted } from "../../../Utils/Security/index.js";
import * as db from "../../../database/dbService.js";

export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await db.findOne({
    model: "teacher",
    where: { user_id: req.user.id },
    include: {
      user: {
        include: {
          wallet: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
              },
              currency: true,
            },
          },
        },
      },
      schedules: {
        include: {
          teacher: true,
          subject: true,
          student: { include: { user: true } },
        },
      },
      teacherSubjects: { include: { subject: true } },
    },
  });

  if (!user) {
    return errorResponse({
      next,
      req,
      status: 404,
      message: "TEACHER_NOT_FOUND",
    });
  }

  const decTeacherPhone = looksEncrypted(user.user.phone) ? await decryptText({ text: user.user.phone }) : user.user.phone;
  
  for (const schedule of user.schedules) {
    if (schedule.student && schedule.student.user && schedule.student.user.phone) {
      schedule.student.user.phone = looksEncrypted(schedule.student.user.phone) ? await decryptText({ text: schedule.student.user.phone }) : schedule.student.user.phone;
    }
  }

  const students = Object.values(
    user.schedules.reduce((acc, item) => {
      const student = item.student;
      if (!acc[student?.id]) {
        acc[student.id] = {
          id: student.id,
          name: student?.user.name,
          code: `STU-${student.id.slice(0, 3)}`,
          email: student.user.email,
          phone: `${student.user.code_country}${student.user.phone}`,
          subject: {
            name: item.subject.name_en,
            code: `SUB-${item.subject.id.slice(0, 3)}`,
          },
          sessions: `${student.sessions_attended}/${student.sessions}`,
        };
      }
      return acc;
    }, {}),
  );

  const mapped = {
    teacher: {
      id: user.id,
      user_id: user.user_id,
      name: user.user.name,
      email: user.user.email,
      meeting_link: user.meeting_link,
      phone: `${user.user.code_country} ${decTeacherPhone}`, // ✅ استخدم الـ decrypted phone
      gender: user.gender,
      hourPrice: user.hour_price,
      status: user.user.status,
      active: user.active,
      wallet: user.user.wallet,
    },
    stats: {
      totalStudents: students.length,
      totalSubjects: user.teacherSubjects.length,
      totalSessions: user.schedules.length,
    },
    subjects: user.teacherSubjects.map((ts) => ({
      nameEn: ts.subject.name_en,
      nameAr: ts.subject.name_ar,
      color: ts.subject.color,
      active: ts.subject.active,
    })),
    schedules: user.schedules.map((s) => ({
      title: s.title,
      description: s.description,
      type: s.type,
      status: s.status,
      startTime: s.start_time,
      endTime: s.end_time,
      isRecurring: s.is_recurring,
      link: s.link,
      notes: s.notes,
      subject: {
        nameEn: s.subject.name_en,
        nameAr: s.subject.name_ar,
        color: s.subject.color,
      },
      student: {
        name: s.student.user.name,
        email: s.student.user.email,
        gender: s.student.gender,
        country: s.student.country,
        status: s.student.status,
        sessions: {
          total: s.student.sessions,
          attended: s.student.sessions_attended,
          remaining: s.student.sessions_remaining,
        },
      },
    })),
    students, // ✅ الطلاب الـ unique
  };

  return successResponse({
    res,
    req,
    data: mapped,
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const user = await db.findOne({
    model: "teacher",
    where: { user_id: req.user.id },
    include: {
      user: {
        include: {
          wallet: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
              },
              currency: true,
            },
          },
        },
      },
      schedules: {
        include: {
          teacher: true,
          subject: true,
          student: { include: { user: true } },
        },
      },
      teacherSubjects: { include: { subject: true } },
    },
  });

  const now = getNowUTC();

  // Day boundaries in UTC
  const startOfDay = now.startOf("day").toDate();
  const endOfDay = now.endOf("day").toDate();

  const todaySchedules = await db.findMany({
    model: "schedule",
    where: {
      teacherId: user.id,
      start_time: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (!user) {
    return errorResponse({
      next,
      req,
      status: 404,
      message: "TEACHER_NOT_FOUND",
    });
  }

  const decTeacherPhone = looksEncrypted(user.user.phone) ? await decryptText({ text: user.user.phone }) : user.user.phone;
  
  for (const schedule of user.schedules) {
    if (schedule.student && schedule.student.user && schedule.student.user.phone) {
      schedule.student.user.phone = looksEncrypted(schedule.student.user.phone) ? await decryptText({ text: schedule.student.user.phone }) : schedule.student.user.phone;
    }
  }

  const students = Object.values(
    user.schedules.reduce((acc, item) => {
      const student = item.student;
      if (!acc[student?.id]) {
        acc[student.id] = {
          id: student.id,
          name: student?.user.name,
          code: `STU-${student.id.slice(0, 3)}`,
          email: student.user.email,
          phone: `${student.user.code_country}${student.user.phone}`,
          subject: {
            name: item.subject.name_en,
            code: `SUB-${item.subject.id.slice(0, 3)}`,
          },
          sessions: `${student.sessions_attended}/${student.sessions}`,
        };
      }
      return acc;
    }, {}),
  );

  return successResponse({
    res,
    req,
    data: {
      stats: {
        totalStudents: students.length,
        totalSubjects: user.teacherSubjects.length,
        totalSessions: user.schedules.length,
      },
      subjects: user.teacherSubjects.map((ts) => ({
        nameEn: ts.subject.name_en,
        nameAr: ts.subject.name_ar,
        color: ts.subject.color,
        active: ts.subject.active,
      })),
      schedules: user.schedules.map((s) => ({
        title: s.title,
        description: s.description,
        type: s.type,
        status: s.status,
        startTime: s.start_time,
        endTime: s.end_time,
        isRecurring: s.is_recurring,
        link: s.link,
        notes: s.notes,
        subject: {
          nameEn: s.subject.name_en,
          nameAr: s.subject.name_ar,
          color: s.subject.color,
        },
        student: {
          name: s.student.user.name,
          email: s.student.user.email,
          gender: s.student.gender,
          country: s.student.country,
          status: s.student.status,
          sessions: {
            total: s.student.sessions,
            attended: s.student.sessions_attended,
            remaining: s.student.sessions_remaining,
          },
        },
      })),

      todaySchedules,
      students, // ✅ الطلاب الـ unique
    },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const updateProfileMeetingLink = asyncHandler(async (req, res, next) => {
  const { meeting_link } = req.body;

  const user = await db.findOne({
    model: "teacher",
    where: { user_id: req.user.id },
    include: {
      user: {
        include: {
          wallet: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
              },
              currency: true,
            },
          },
        },
      },
      schedules: {
        include: {
          teacher: true,
          subject: true,
          student: { include: { user: true } },
        },
      },
      teacherSubjects: { include: { subject: true } },
    },
  });

  if (!user) {
    return errorResponse({
      next,
      req,
      status: 404,
      message: "TEACHER_NOT_FOUND",
    });
  }
  const updatedUser = await db.updateOne({
    model: "teacher",
    where: { id: user.id },
    data: { meeting_link },
  });

  return successResponse({
    res,
    req,
    data: updatedUser,
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
