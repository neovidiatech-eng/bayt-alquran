import { getNowUTC, formatSchedules } from "../../../Utils/Date/time.js";
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
          groupStudents: { include: { student: { include: { user: true } } } },
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

  const decTeacherPhone = looksEncrypted(user.user?.phone)
    ? await decryptText({ text: user.user.phone })
    : user.user?.phone;

  for (const schedule of user.schedules) {
    if (schedule.student?.user?.phone) {
      schedule.student.user.phone = looksEncrypted(schedule.student.user.phone)
        ? await decryptText({ text: schedule.student.user.phone })
        : schedule.student.user.phone;
    }
    if (schedule.groupStudents) {
      for (const gs of schedule.groupStudents) {
        if (gs.student?.user?.phone) {
          gs.student.user.phone = looksEncrypted(gs.student.user.phone)
            ? await decryptText({ text: gs.student.user.phone })
            : gs.student.user.phone;
        }
      }
    }
  }

  const studentsMap = {};
  for (const schedule of user.schedules) {
    const sessionStudents = schedule.isGroup
      ? schedule.groupStudents?.map((gs) => gs.student).filter(Boolean) || []
      : schedule.student
      ? [schedule.student]
      : [];

    for (const student of sessionStudents) {
      if (student?.id && !studentsMap[student.id]) {
        studentsMap[student.id] = {
          id: student.id,
          name: student.user?.name || "Student",
          code: `STU-${student.id.slice(0, 3)}`,
          email: student.user?.email || "",
          phone: student.user?.phone
            ? `${student.user.code_country || ""}${student.user.phone}`
            : "",
          subject: {
            name: schedule.subject?.name_en || "",
            code: schedule.subject?.id
              ? `SUB-${schedule.subject.id.slice(0, 3)}`
              : "",
          },
          sessions: `${student.sessions_attended ?? 0}/${student.sessions ?? 0}`,
        };
      }
    }
  }
  const students = Object.values(studentsMap);

  const mapped = {
    teacher: {
      id: user.id,
      user_id: user.user_id,
      name: user.user?.name,
      email: user.user?.email,
      meeting_link: user.meeting_link,
      phone: `${user.user?.code_country || ""} ${decTeacherPhone || ""}`.trim(),
      gender: user.gender,
      hourPrice: user.hour_price,
      status: user.user?.status,
      active: user.active,
      wallet: user.user?.wallet,
    },
    stats: {
      totalStudents: students.length,
      totalSubjects: user.teacherSubjects.length,
      totalSessions: user.schedules.length,
    },
    subjects: user.teacherSubjects.map((ts) => ({
      nameEn: ts.subject?.name_en,
      nameAr: ts.subject?.name_ar,
      color: ts.subject?.color,
      active: ts.subject?.active,
    })),
    schedules: formatSchedules(user.schedules, req.timezone).map((s) => {
      const studentObj = s.student
        ? {
            name: s.student.user?.name,
            email: s.student.user?.email,
            gender: s.student.gender,
            country: s.student.country,
            status: s.student.status,
            sessions: {
              total: s.student.sessions,
              attended: s.student.sessions_attended,
              remaining: s.student.sessions_remaining,
            },
          }
        : s.groupStudents?.[0]?.student
        ? {
            name: s.groupStudents[0].student.user?.name,
            email: s.groupStudents[0].student.user?.email,
            gender: s.groupStudents[0].student.gender,
            country: s.groupStudents[0].student.country,
            status: s.groupStudents[0].student.status,
            sessions: {
              total: s.groupStudents[0].student.sessions,
              attended: s.groupStudents[0].student.sessions_attended,
              remaining: s.groupStudents[0].student.sessions_remaining,
            },
          }
        : null;

      return {
        title: s.title,
        description: s.description,
        type: s.type,
        status: s.status,
        startTime: s.start_time,
        endTime: s.end_time,
        display_start_time: s.display_start_time,
        display_end_time: s.display_end_time,
        display_timezone: s.display_timezone,
        isRecurring: s.is_recurring,
        link: s.link,
        notes: s.notes,
        subject: {
          nameEn: s.subject?.name_en || "",
          nameAr: s.subject?.name_ar || "",
          color: s.subject?.color || "",
        },
        student: studentObj,
      };
    }),
    students,
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
          groupStudents: { include: { student: { include: { user: true } } } },
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

  for (const schedule of user.schedules) {
    if (schedule.student?.user?.phone) {
      schedule.student.user.phone = looksEncrypted(schedule.student.user.phone)
        ? await decryptText({ text: schedule.student.user.phone })
        : schedule.student.user.phone;
    }
    if (schedule.groupStudents) {
      for (const gs of schedule.groupStudents) {
        if (gs.student?.user?.phone) {
          gs.student.user.phone = looksEncrypted(gs.student.user.phone)
            ? await decryptText({ text: gs.student.user.phone })
            : gs.student.user.phone;
        }
      }
    }
  }

  const studentsMap = {};
  for (const schedule of user.schedules) {
    const sessionStudents = schedule.isGroup
      ? schedule.groupStudents?.map((gs) => gs.student).filter(Boolean) || []
      : schedule.student
      ? [schedule.student]
      : [];

    for (const student of sessionStudents) {
      if (student?.id && !studentsMap[student.id]) {
        studentsMap[student.id] = {
          id: student.id,
          name: student.user?.name || "Student",
          code: `STU-${student.id.slice(0, 3)}`,
          email: student.user?.email || "",
          phone: student.user?.phone
            ? `${student.user.code_country || ""}${student.user.phone}`
            : "",
          subject: {
            name: schedule.subject?.name_en || "",
            code: schedule.subject?.id
              ? `SUB-${schedule.subject.id.slice(0, 3)}`
              : "",
          },
          sessions: `${student.sessions_attended ?? 0}/${student.sessions ?? 0}`,
        };
      }
    }
  }
  const students = Object.values(studentsMap);

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
        nameEn: ts.subject?.name_en,
        nameAr: ts.subject?.name_ar,
        color: ts.subject?.color,
        active: ts.subject?.active,
      })),
      schedules: formatSchedules(user.schedules, req.timezone).map((s) => {
        const studentObj = s.student
          ? {
              name: s.student.user?.name,
              email: s.student.user?.email,
              gender: s.student.gender,
              country: s.student.country,
              status: s.student.status,
              sessions: {
                total: s.student.sessions,
                attended: s.student.sessions_attended,
                remaining: s.student.sessions_remaining,
              },
            }
          : s.groupStudents?.[0]?.student
          ? {
              name: s.groupStudents[0].student.user?.name,
              email: s.groupStudents[0].student.user?.email,
              gender: s.groupStudents[0].student.gender,
              country: s.groupStudents[0].student.country,
              status: s.groupStudents[0].student.status,
              sessions: {
                total: s.groupStudents[0].student.sessions,
                attended: s.groupStudents[0].student.sessions_attended,
                remaining: s.groupStudents[0].student.sessions_remaining,
              },
            }
          : null;

        return {
          title: s.title,
          description: s.description,
          type: s.type,
          status: s.status,
          startTime: s.start_time,
          endTime: s.end_time,
          display_start_time: s.display_start_time,
          display_end_time: s.display_end_time,
          display_timezone: s.display_timezone,
          isRecurring: s.is_recurring,
          link: s.link,
          notes: s.notes,
          subject: {
            nameEn: s.subject?.name_en || "",
            nameAr: s.subject?.name_ar || "",
            color: s.subject?.color || "",
          },
          student: studentObj,
        };
      }),
      todaySchedules,
      students,
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
