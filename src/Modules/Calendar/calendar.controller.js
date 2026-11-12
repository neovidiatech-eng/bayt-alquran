import { asyncHandler, successResponse, errorResponse } from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { toUTC, formatSchedules } from "../../Utils/Date/time.js";
import dayjs from "dayjs";
import {
  getModeratorStudentIds,
  buildStudentScheduleFilter,
} from "../../Utils/Permissions/permissions.js";

export const getCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const now = dayjs().tz(req.timezone || "Africa/Cairo");

  // Day boundaries in UTC
  const startOfDay = now.startOf("day").toDate();
  const endOfDay = now.endOf("day").toDate();

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  const moderatorScheduleFilter =
    assignedStudentIds !== null
      ? buildStudentScheduleFilter(assignedStudentIds)
      : {};

  const [count, planned, sessions, toDaySessions] = await Promise.all([
    db.count({
      model: "schedule",
      where: moderatorScheduleFilter,
    }),
    db.count({
      model: "schedule",
      where: {
        status: { in: ["scheduled", "planned"] },
        ...moderatorScheduleFilter,
      },
    }),
    db.findMany({
      model: "schedule",
      where: moderatorScheduleFilter,
      include: {
        reviews: {
          include: {
            reviewee: true,
            reviewer: true,
          },
        },
      },
    }),
    db.findMany({
      model: "schedule",
      where: {
        start_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
        ...moderatorScheduleFilter,
      },
      include: {
        reviews: true,
      },
    }),
  ]);
  const formattedSessions = formatSchedules(sessions, req.timezone);
  const formattedTodaySessions = formatSchedules(toDaySessions, req.timezone);
  return successResponse({
    res,
    req,
    data: { sessions: formattedSessions, count, planned, toDaySessions: formattedTodaySessions },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const getStudentCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const { user } = req;
  const now = dayjs().tz(req.timezone || "Africa/Cairo");
  const id = user.student?.id;
  if (!id) {
    return errorResponse({ req, next, message: "STUDENT_NOT_FOUND", status: 404 });
  }
  // Day boundaries in UTC
  const startOfDay = now.startOf("day").toDate();
  const endOfDay = now.endOf("day").toDate();

  const [count, planned, sessions, toDaySessions] = await Promise.all([
    db.count({
      model: "schedule",
      where: {
        OR: [
          { studentId: id },
          { groupStudents: { some: { studentId: id } } },
        ],
      },
    }),
    db.count({
      model: "schedule",
      where: {
        status: { in: ["scheduled", "planned"] },
        OR: [
          { studentId: id },
          { groupStudents: { some: { studentId: id } } },
        ],
      },
    }),
    db.findMany({
      model: "schedule",
      where: {
        OR: [
          { studentId: id },
          { groupStudents: { some: { studentId: id } } },
        ],
      },
      include: {
        teacher: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
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
                  },
                },
              },
            },
          },
        },
        subject: true,
      },
    }),
    db.findMany({
      model: "schedule",
      where: {
        start_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
        OR: [
          { studentId: id },
          { groupStudents: { some: { studentId: id } } },
        ],
      },
      include: {
        teacher: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
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
                  },
                },
              },
            },
          },
        },
        subject: true,
      },
    }),
  ]);
  const formattedSessions = formatSchedules(sessions, req.timezone);
  const formattedTodaySessions = formatSchedules(toDaySessions, req.timezone);
  return successResponse({
    res,
    req,
    data: { sessions: formattedSessions, count, planned, toDaySessions: formattedTodaySessions },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const getTeacherCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const { user } = req;
  const now = dayjs().tz(req.timezone || "Africa/Cairo");
  const id = user.teacher?.id;
  if (!id) {
    return errorResponse({ req, next, message: "TEACHER_NOT_FOUND", status: 404 });
  }

  // Day boundaries in UTC
  const startOfDay = now.startOf("day").toDate();
  const endOfDay = now.endOf("day").toDate();

  const [count, planned, sessions, toDaySessions] = await Promise.all([
    db.count({
      model: "schedule",
      where: {
        teacherId: id,
      },
      include: {
        teacher: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.count({
      model: "schedule",
      where: {
        status: { in: ["scheduled", "planned"] },
        teacherId: id,
      },
      include: {
        teacher: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.findMany({
      model: "schedule",
      where: {
        teacherId: id,
      },
      include: {
        teacher: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        subject: true,
      },
    }),
    db.findMany({
      model: "schedule",
      where: {
        start_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
        teacherId: id,
      },
      include: {
        teacher: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        subject: true,
      },
    }),
  ]);
  const formattedSessions = formatSchedules(sessions, req.timezone);
  const formattedTodaySessions = formatSchedules(toDaySessions, req.timezone);
  return successResponse({
    res,
    req,
    data: { sessions: formattedSessions, count, planned, toDaySessions: formattedTodaySessions },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});

export const getTeachersCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const start = toUTC(startDate, req.timezone)?.toDate();
  const end = toUTC(endDate, req.timezone)?.toDate();
  const assignedStudentIds = await getModeratorStudentIds(req.user);
  const teachers = await db.findMany({
    model: "teacher",
    select: {
      id: true,
      gender: true,
      schedules: {
        where: {
          start_time: {
            gte: start,
            lte: end,
          },
          ...(assignedStudentIds !== null &&
            buildStudentScheduleFilter(assignedStudentIds)),
        },
        select: {
          id: true,
          start_time: true,
          end_time: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const formattedTeachers = teachers.map((teacher) => ({
    ...teacher,
    schedules: formatSchedules(teacher.schedules, req.timezone),
  }));

  return successResponse({
    res,
    req,
    data: { teachers: formattedTeachers },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
