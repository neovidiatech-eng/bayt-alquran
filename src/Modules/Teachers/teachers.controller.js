import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { ensureExists } from "../../database/genericService.js";
import { hash } from "../../Utils/Security/index.js";

export const getAllTeachers = asyncHandler(async (req, res, next) => {
  const { search, page = 1, limit = 10, active } = req.query;

  let where = {};
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
    currency_id,
    gender,
    hour_price,
    active,
    subject_ids,
    timezone,
    meeting_link,
  } = req.body;

  // Parallel checks for existence/uniqueness
  const [
    checkUserByEmail,
    checkUserByPhone,
    checkCurrency,
    checkSubjects,
    getrole,
  ] = await Promise.all([
    db.findOne({ model: "user", where: { email } }),
    db.findFirst({ model: "user", where: { phone } }),
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
  if (checkUserByPhone)
    return errorResponse({
      req,
      message: "PHONE_EXISTS",
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

  const hashedPassword = await hash({ password });

  // Use a transaction to ensure both user and profile are created
  const result = await db.transaction(async (tx) => {
    const user = await tx.create({
      model: "user",
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        code_country,
        ...(getrole && { roleId: getrole.id }),
        confirmAt: new Date(), // Teachers created by admin are confirmed by default
        status: "active",
        timezone,
      },
    });

    const teacher = await tx.create({
      model: "teacher",
      data: {
        user: { connect: { id: user.id } },
        currency: { connect: { id: checkCurrency.id } },
        gender,
        hour_price,
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

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: teacher,
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
    currency_id,
    gender,
    hour_price,
    active,
    subject_ids,
    timezone,
  } = req.body;

  const teacher = await ensureExists({
    model: "teacher",
    where: { id },
    include: { user: true },
  });

  let hashedPassword;
  if (password) {
    hashedPassword = await hash({ password });
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

  if (phone && phone !== teacher.user.phone) {
    const existing = await db.findFirst({ model: "user", where: { phone } });
    if (existing)
      return errorResponse({
        req,
        message: "PHONE_EXISTS",
        next,
        status: 400,
      });
  }

  // Update user data first if needed
  if (name || email || hashedPassword || phone || code_country) {
    await db.updateOne({
      model: "user",
      where: { id: teacher.user_id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(phone && { phone }),
        ...(code_country && { code_country }),
        ...(timezone && { timezone }),
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
      ...(hour_price !== undefined && { hour_price }),
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

  const myStudents = await db.findMany({
    model: "schedule",
    where: {
      teacherId: teacher.id,
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
      subject: true,
      teacher: {
        include: {
          user: true,
        },
      },
    },
  });

  const students = Object.values(
    myStudents.reduce((acc, item) => {
      const student = item.student;

      if (!acc[student.id]) {
        acc[student.id] = {
          id: student.id,
          name: student.user.name,
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
    message: "FETCH_SUCCESS",
    data: students,
  });
});
