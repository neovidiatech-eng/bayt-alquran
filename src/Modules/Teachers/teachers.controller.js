import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { ensureExists } from "../../database/genericService.js";
import {
  decryptUserSensitiveFields,
  encryptPassword,
} from "../../Utils/Security/index.js";
import { createAdminNotification } from "../Notifications/notifications.controller.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getAllTeachers = asyncHandler(async (req, res, next) => {
  const { search, page = 1, limit = 10, active } = req.query;

  let where = {
    approved: true,
  };
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  if (active !== undefined) {
    where.active = active === "true";
  }

  const { items: teachers, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "teacher",
      where,
      page,
      limit,
      include: {
        user: true,
        teacherSubjects: {
          include: { subject: true },
        },
      },
    });

  const activeCount = await db.count({
    model: "teacher",
    where: { active: true },
  });

  await Promise.all(
    teachers.map((teacher) => decryptUserSensitiveFields(teacher.user)),
  );

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: {
      teachers,
      pagination,
      activeCount,
      inactiveCount: pagination.totalItems - activeCount,
    },
  });
});

export const createTeacher = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    code_country,
    country,
    nationality,
    currency_id,
    gender,
    one_hour_price,
    group_hour_price,
    active,
    subject_ids,
    timezone,
    meeting_link,
    age,
    city,
  } = req.body;

  // Parallel checks for existence/uniqueness
  const [checkUserByEmail, checkCurrency, checkSubjects, getrole] =
    await Promise.all([
      db.findOne({ model: "user", where: { email } }),
      db.findOne({ model: "currency", where: { id: currency_id } }),
      db.findMany({
        model: "subjects",
        where: { id: { in: subject_ids || [] } },
      }),
      db.findFirst({ model: "role", where: { name: "teacher" } }),
    ]);

  if (!getrole)
    return errorResponse({
      req,
      message: "ROLE_NOT_FOUND",
      next,
      status: 404,
    });

  if (checkUserByEmail)
    return errorResponse({
      req,
      message: "EMAIL_EXISTS",
      next,
      status: 400,
    });
  if (!checkCurrency)
    return errorResponse({
      req,
      message: "CURRENCY_NOT_FOUND",
      next,
      status: 404,
    });
  if (subject_ids && checkSubjects.length !== subject_ids.length) {
    return errorResponse({
      req,
      message: "SOME_SUBJECTS_NOT_FOUND",
      next,
      status: 404,
    });
  }

  const encryptedPassword = encryptPassword({ password });

  // Use a transaction to ensure both user and profile are created
  const result = await db.transaction(async (tx) => {
    const user = await tx.create({
      model: "user",
      data: {
        name,
        email,
        password: encryptedPassword,
        phone,
        code_country,
        country,
        nationality,
        ...(getrole && { roleId: getrole.id }),
        confirmAt: new Date(), // Teachers created by admin are confirmed by default
        status: "active",
        timezone,
        age: age ? Number(age) : undefined,
        city: city || undefined,
      },
    });

    const teacher = await tx.create({
      model: "teacher",
      data: {
        user: { connect: { id: user.id } },
        currency: { connect: { id: checkCurrency.id } },
        gender,
        hour_price: one_hour_price,
        group_hour_price: group_hour_price,
        approved: true,
        meeting_link,
        active: active ?? false,
        teacherSubjects: {
          create: (subject_ids || []).map((subject_id) => ({
            subject: { connect: { id: subject_id } },
          })),
        },
      },
      include: { user: true },
    });

    await tx.create({
      model: "wallet",
      data: {
        type: "teacher",
        ownerId: user.id,
        balance: 0,
        currencyId: checkCurrency.id,
        userId: user.id,
      },
    });

    return teacher;
  });

  await createAdminNotification({
    title: "تم اضافة مدرس جديد",
    message: `تم اضافة مدرس جديد: ${name} (${email}).`,
    type: "new_teacher",
  });

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    data: result,
    status: 201,
  });
});

export const getTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const teacher = await ensureExists({
    model: "teacher",
    where: { id },
    include: {
      user: true,
      currency: true,
      teacherSubjects: {
        include: { subject: true },
      },
    },
    message: "TEACHER_NOT_FOUND",
  });

  await decryptUserSensitiveFields(teacher.user);

  // Calculate teacher stats
  const students = await db.findMany({
    model: "student_teacher",
    where: {
      teacherId: id,
    },
    include: {
      student: { include: { user: true } },
    },
  });

  console.log(students);

  const finalStudents = await Promise.all(
    students.map(async ({ student, hour_price }) => {
      if (!student) return null;

      await decryptUserSensitiveFields(student.user);

      return {
        ...student,
        hour_price,
      };
    }),
  );

  const completedSessionsCount = await db.count({
    model: "schedule",
    where: {
      teacherId: id,
      status: "completed",
    },
  });

  const tz = req.timezone || "Africa/Cairo";
  const nowLocal = dayjs().tz(tz);
  const startOfDay = nowLocal.startOf("day").utc().toDate();
  const endOfDay = nowLocal.endOf("day").utc().toDate();

  const todaySessionsCount = await db.count({
    model: "schedule",
    where: {
      teacherId: id,
      start_time: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const upcomingSessionsCount = await db.count({
    model: "schedule",
    where: {
      teacherId: id,
      status: { in: ["scheduled", "planned"] },
      start_time: {
        gte: nowLocal.utc().toDate(),
      },
    },
  });

  // Calculate durations and earnings
  const completedSchedules = await db.findMany({
    model: "schedule",
    where: {
      teacherId: id,
      status: "completed",
    },
    select: {
      start_time: true,
      end_time: true,
    },
  });

  const pendingSchedules = await db.findMany({
    model: "schedule",
    where: {
      teacherId: id,
      status: { in: ["scheduled", "ongoing", "planned"] },
    },
    select: {
      start_time: true,
      end_time: true,
    },
  });

  const calculateHours = (schedules) => {
    return schedules.reduce((total, s) => {
      const diffMs = new Date(s.end_time) - new Date(s.start_time);
      const hours = diffMs / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  const completedHours = calculateHours(completedSchedules);
  const pendingHours = calculateHours(pendingSchedules);
  const totalHours = completedHours + pendingHours;

  const completedEarnings = completedHours * teacher.hour_price;
  const pendingEarnings = pendingHours * teacher.hour_price;

  const wallet = await db.findFirst({
    model: "Wallet",
    where: {
      userId: teacher.user_id,
      type: "teacher",
    },
  });
  const availableBalance = wallet ? wallet.balance : 0;

  const pendingWithdrawalsResult = await db.findMany({
    model: "WithdrawalRequest",
    where: {
      teacherId: teacher.user_id,
      status: "pending",
    },
    select: {
      amount: true,
    },
  });
  const pendingWithdrawals = pendingWithdrawalsResult.reduce(
    (sum, w) => sum + w.amount,
    0,
  );

  const totalDue = availableBalance + pendingEarnings;
  const totalEarnings = completedEarnings + pendingEarnings;

  const teacherData = {
    ...teacher,
    students: finalStudents.filter(Boolean),

    stats: {
      totalStudents: finalStudents.length,
      completedSessions: completedSessionsCount,
      todaySessions: todaySessionsCount,
      upcomingSessions: upcomingSessionsCount,
      financials: {
        totalHours,
        hourPrice: teacher.hour_price || 0,
        groupHourPrice: teacher.group_hour_price || 0,
        totalDue,
        totalEarnings,
        completedEarnings,
        completedHours,
        pendingEarnings,
        pendingHours,
        availableBalance,
        pendingWithdrawals,
      },
    },
  };

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: teacherData,
  });
});

export const updateTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    email,
    password,
    phone,
    code_country,
    country,
    nationality,
    currency_id,
    gender,
    one_hour_price,
    group_hour_price,
    meeting_link,
    active,
    subject_ids,
    timezone,
    age,
    city,
  } = req.body;

  const teacher = await ensureExists({
    model: "teacher",
    where: { id },
    include: { user: true },
  });

  let encryptedPassword;
  if (password) {
    encryptedPassword = encryptPassword({ password });
  }

  // Handle unique constraints
  if (email && email !== teacher.user.email) {
    const existing = await db.findOne({ model: "user", where: { email } });
    if (existing)
      return errorResponse({
        req,
        message: "EMAIL_EXISTS",
        next,
        status: 400,
      });
  }

  // Update user data first if needed
  if (
    name ||
    email ||
    encryptedPassword ||
    phone ||
    code_country ||
    country ||
    nationality ||
    timezone ||
    age !== undefined ||
    city !== undefined
  ) {
    await db.updateOne({
      model: "user",
      where: { id: teacher.user_id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(encryptedPassword && { password: encryptedPassword }),
        ...(phone && { phone }),
        ...(code_country && { code_country }),
        ...(country && { country }),
        ...(nationality && { nationality }),
        ...(timezone && { timezone }),
        ...(age !== undefined && { age: age ? Number(age) : null }),
        ...(city !== undefined && { city: city || null }),
      },
    });
  }



  // Update teacher data
  const updatedTeacher = await db.updateOne({
    model: "teacher",
    where: { id },
    data: {
      ...(currency_id && { currency: { connect: { id: currency_id } } }),
      ...(gender && { gender }),
      ...(one_hour_price !== undefined && {
        hour_price: one_hour_price,
      }),
      ...(group_hour_price !== undefined && {
        group_hour_price: group_hour_price,
      }),
      ...(meeting_link !== undefined && { meeting_link }),
      ...(active !== undefined && { active }),
      ...(subject_ids && {
        teacherSubjects: {
          deleteMany: {},
          create: subject_ids.map((subject_id) => ({
            subject: { connect: { id: subject_id } },
          })),
        },
      }),
    },
    include: {
      user: true,
      currency: true,
      teacherSubjects: { include: { subject: true } },
    },
  });

  await decryptUserSensitiveFields(updatedTeacher.user);

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: updatedTeacher,
  });
});

export const deleteTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const teacher = await ensureExists({ model: "teacher", where: { id } });

  // Delete related records and user
  // Since we added onDelete: Cascade in schema, deleting the user will delete the teacher record too.
  await db.deleteOne({
    model: "user",
    where: { id: teacher.user_id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
  });
});

export const getMyStudents = asyncHandler(async (req, res, next) => {
  const teacher = req.user.teacher;

  if (!teacher) {
    return errorResponse({ req, next, status: 403, message: "NOT_A_TEACHER" });
  }

  const myStudents = await db.findMany({
    model: "student_teacher",
    where: { teacherId: teacher.id },
    include: {
      student: {
        include: {
          user: true,
          plan: true,
        },
      },
    },
  });

  const studentsMap = {};
  for (const item of myStudents) {
    const student = item?.student;
    if (!studentsMap[student?.id]) {
      await decryptUserSensitiveFields(student?.user);

      // Use per-student custom rate; fallback to teacher's default rate
      const hourPrice = item?.hour_price || teacher?.hour_price || 0;
      const sessionTime = student?.plan?.sessionTime ?? null; // minutes
      const sessionPrice =
        sessionTime !== null ? (hourPrice / 60) * sessionTime : null;

      studentsMap[student?.id] = {
        id: student?.id,
        name: student?.user?.name,
        code: `STU-${student?.id?.slice(0, 3)}`,
        email: student?.user?.email,
        phone: student?.user?.phone,
        sessions: `${student?.sessions_attended}/${student?.sessions}`,
        hour_price: hourPrice,
        session_price:
          sessionPrice !== null ? parseFloat(sessionPrice.toFixed(2)) : null,
        plan: student?.plan?.name_en ?? null,
        session_duration_minutes: sessionTime,
      };
    }
  }

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: Object.values(studentsMap),
  });
});

export const updateStudentHourPrice = asyncHandler(async (req, res, next) => {
  const { teacherId } = req.params;
  const { hour_price, studentId } = req.body;

  const link = await db.findFirst({
    model: "student_teacher",
    where: { studentId, teacherId },
  });

  if (!link) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "STUDENT_NOT_FOUND",
    });
  }

  const updated = await db.updateOne({
    model: "student_teacher",
    where: { id: link.id },
    data: { hour_price: parseFloat(hour_price) },
    include: {
      student: { include: { user: true, plan: true } },
    },
  });

  const sessionTime = updated.student?.plan?.sessionTime ?? null;
  const sessionPrice =
    sessionTime !== null
      ? parseFloat(((hour_price / 60) * sessionTime).toFixed(2))
      : null;

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: {
      studentId,
      hour_price,
      session_price: sessionPrice,
      session_duration_minutes: sessionTime,
    },
  });
});
