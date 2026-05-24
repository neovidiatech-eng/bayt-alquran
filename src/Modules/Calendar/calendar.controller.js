import { asyncHandler, successResponse, errorResponse } from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { getNowUTC, toUTC } from "../../Utils/Date/time.js";

export const getCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const now = getNowUTC();

  // Day boundaries in UTC
  const startOfDay = now.startOf("day").toDate();
  const endOfDay = now.endOf("day").toDate();

  const [count, planned, sessions, toDaySessions] = await Promise.all([
    db.count({
      model: "schedule",
    }),
    db.count({
      model: "schedule",
      where: {
        status: "planned",
      },
    }),
    db.findMany({
      model: "schedule",
    }),
    db.findMany({
      model: "schedule",
      where: {
        start_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),
  ]);
  return successResponse({
    res,
    req,
    data: { sessions, count, planned, toDaySessions },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const getStudentCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const { user } = req;
  const now = getNowUTC();
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
        studentId: id,
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
        status: "planned",
        studentId: id,
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
        studentId: id,
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
        studentId: id,
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
  return successResponse({
    res,
    req,
    data: { sessions, count, planned, toDaySessions },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
export const getTeacherCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const { user } = req;
  const now = getNowUTC();
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
        status: "planned",
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
  return successResponse({
    res,
    req,
    data: { sessions, count, planned, toDaySessions },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});

export const getTeachersCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const start = toUTC(startDate)?.toDate();
  const end = toUTC(endDate)?.toDate();
  const teachers = await db.findMany({
    model: "teacher",
    select: {
      id: true,
      hour_price: true,
      gender: true,
      schedules: {
        where: {
          start_time: {
            gte: start,
            lte: end,
          },
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

  return successResponse({
    res,
    req,
    data: { teachers },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
