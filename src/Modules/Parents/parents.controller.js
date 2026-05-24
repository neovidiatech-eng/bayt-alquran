import { asyncHandler, successResponse, errorResponse } from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { ensureExists } from "../../database/genericService.js";
import { hash, encryptText, decryptText, looksEncrypted } from "../../Utils/Security/index.js";

// GET /parents
export const getAllParents = asyncHandler(async (req, res, next) => {
  const { search, page = 1, limit = 10, active } = req.query;

  const parentRole = await db.findFirst({
    model: "role",
    where: { name: { equals: "parent", mode: "insensitive" } },
  });

  if (!parentRole) {
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
  }

  let where = {
    roleId: parentRole.id,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (active !== undefined) {
    where.status = active === "true" ? "active" : { not: "active" };
  }

  const { items: parents, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "user",
      where,
      page,
      limit,
      include: {
        parentStudents: {
          select: {
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
      },
    });

  const parentsData = await Promise.all(
    parents.map(async (parent) => {
      const phone = parent.phone ? (looksEncrypted(parent.phone) ? await decryptText({ text: parent.phone }) : parent.phone) : null;
      return {
        id: parent.id,
        name: parent.name,
        email: parent.email,
        phone: phone,
        code_country: parent.code_country,
        status: parent.status,
        active: parent.status === "active",
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
        students: parent.parentStudents.map((ps) => ps.student),
      };
    })
  );

  const activeCount = await db.count({
    model: "user",
    where: { roleId: parentRole.id, status: "active" },
  });

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: {
      parents: parentsData,
      pagination,
      activeCount,
      inactiveCount: pagination.totalItems - activeCount,
    },
  });
});

// GET /parents/:id
export const getParent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const parentRole = await db.findFirst({
    model: "role",
    where: { name: { equals: "parent", mode: "insensitive" } },
  });

  if (!parentRole) {
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
  }

  const parent = await ensureExists({
    model: "user",
    where: { id, roleId: parentRole.id },
    include: {
      parentStudents: {
        select: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
    message: "PARENT_NOT_FOUND",
  });

  const phone = parent.phone ? (looksEncrypted(parent.phone) ? await decryptText({ text: parent.phone }) : parent.phone) : null;

  const students = await Promise.all(
    parent.parentStudents.map(async (ps) => {
      const student = ps.student;
      if (student.user && student.user.phone) {
        student.user.phone = looksEncrypted(student.user.phone) ? await decryptText({ text: student.user.phone }) : student.user.phone;
      }
      return student;
    })
  );

  const formattedParent = {
    id: parent.id,
    name: parent.name,
    email: parent.email,
    phone: phone,
    code_country: parent.code_country,
    status: parent.status,
    active: parent.status === "active",
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
    students,
  };

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: formattedParent,
  });
});

// POST /parents
export const createParent = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    code_country,
    active,
    students = [],
  } = req.body;

  const [checkUserByEmail, checkUserByPhone] = await Promise.all([
    db.findOne({ model: "user", where: { email } }),
    db.findFirst({ model: "user", where: { phone } }),
  ]);

  if (checkUserByEmail) {
    return errorResponse({ req, next, message: "EMAIL_EXISTS", status: 400 });
  }
  if (checkUserByPhone) {
    return errorResponse({ req, next, message: "PHONE_EXISTS", status: 400 });
  }

  const parentRole = await db.findFirst({
    model: "role",
    where: { name: { equals: "parent", mode: "insensitive" } },
  });

  if (!parentRole) {
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
  }

  const hashedPassword = await hash({ password });
  const encryptedPhone = encryptText({ text: phone });

  let newParent;
  await db.transaction(async (tx) => {
    // 1. Create parent user
    newParent = await tx.create({
      model: "user",
      data: {
        name,
        email,
        password: hashedPassword,
        phone: encryptedPhone,
        code_country,
        roleId: parentRole.id,
        status: active === false ? "blocked" : "active",
        confirmAt: new Date(),
      },
    });

    // 2. Link students
    if (students && students.length > 0) {
      for (const studentId of students) {
        const student = await tx.findFirst({
          model: "student",
          where: { id: studentId },
        });

        if (!student) {
          throw new Error(`STUDENT_NOT_FOUND: ${studentId}`);
        }

        await tx.create({
          model: "parentStudent",
          data: {
            parentId: newParent.id,
            studentId: studentId,
          },
        });
      }
    }
  });

  // Fetch created parent details to return
  const createdParent = await db.findOne({
    model: "user",
    where: { id: newParent.id },
    include: {
      parentStudents: {
        select: {
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
    },
  });

  const phoneDecrypted = createdParent.phone ? (looksEncrypted(createdParent.phone) ? await decryptText({ text: createdParent.phone }) : createdParent.phone) : null;

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    status: 201,
    data: {
      id: createdParent.id,
      name: createdParent.name,
      email: createdParent.email,
      phone: phoneDecrypted,
      code_country: createdParent.code_country,
      status: createdParent.status,
      active: createdParent.status === "active",
      createdAt: createdParent.createdAt,
      updatedAt: createdParent.updatedAt,
      students: createdParent.parentStudents.map((ps) => ps.student),
    },
  });
});

// PUT /parents/:id
export const updateParent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    email,
    password,
    phone,
    code_country,
    active,
    students,
  } = req.body;

  const parentRole = await db.findFirst({
    model: "role",
    where: { name: { equals: "parent", mode: "insensitive" } },
  });

  if (!parentRole) {
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
  }

  const parent = await ensureExists({
    model: "user",
    where: { id, roleId: parentRole.id },
  });

  let hashedPassword;
  if (password) {
    hashedPassword = await hash({ password });
  }

  // Handle unique constraints
  if (email && email !== parent.email) {
    const existing = await db.findOne({ model: "user", where: { email } });
    if (existing)
      return errorResponse({
        req,
        message: "EMAIL_EXISTS",
        next,
        status: 400,
      });
  }

  if (phone) {
    const existingUser = await db.findFirst({ model: "user", where: { phone } });
    if (existingUser && existingUser.id !== parent.id) {
      return errorResponse({
        req,
        message: "PHONE_EXISTS",
        next,
        status: 400,
      });
    }
  }

  const encryptedPhone = phone ? encryptText({ text: phone }) : undefined;

  await db.transaction(async (tx) => {
    // 1. Update user details
    await tx.updateOne({
      model: "user",
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(encryptedPhone && { phone: encryptedPhone }),
        ...(code_country && { code_country }),
        ...(active !== undefined && { status: active === true ? "active" : "blocked" }),
      },
    });

    // 2. Update students link if students array is provided
    if (students !== undefined) {
      // Delete old links
      await tx.deleteMany({
        model: "parentStudent",
        where: { parentId: id },
      });

      // Add new links
      if (students && students.length > 0) {
        for (const studentId of students) {
          const student = await tx.findFirst({
            model: "student",
            where: { id: studentId },
          });

          if (!student) {
            throw new Error(`STUDENT_NOT_FOUND: ${studentId}`);
          }

          await tx.create({
            model: "parentStudent",
            data: {
              parentId: id,
              studentId: studentId,
            },
          });
        }
      }
    }
  });

  // Fetch updated parent details to return
  const parentDetails = await db.findOne({
    model: "user",
    where: { id },
    include: {
      parentStudents: {
        select: {
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
    },
  });

  const phoneDecrypted = parentDetails.phone ? (looksEncrypted(parentDetails.phone) ? await decryptText({ text: parentDetails.phone }) : parentDetails.phone) : null;

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: {
      id: parentDetails.id,
      name: parentDetails.name,
      email: parentDetails.email,
      phone: phoneDecrypted,
      code_country: parentDetails.code_country,
      status: parentDetails.status,
      active: parentDetails.status === "active",
      createdAt: parentDetails.createdAt,
      updatedAt: parentDetails.updatedAt,
      students: parentDetails.parentStudents.map((ps) => ps.student),
    },
  });
});

// DELETE /parents/:id
export const deleteParent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const parentRole = await db.findFirst({
    model: "role",
    where: { name: { equals: "parent", mode: "insensitive" } },
  });

  if (!parentRole) {
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
  }

  const parent = await ensureExists({
    model: "user",
    where: { id, roleId: parentRole.id },
  });

  await db.deleteOne({
    model: "user",
    where: { id: parent.id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
  });
});


// GET /parent/students
export const getLinkedStudents = asyncHandler(async (req, res, next) => {
  const parentId = req.user.id;

  const relations = await db.findMany({
    model: "ParentStudent",
    where: { parentId },
    include: {
      student: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          plan: true,
        },
      },
    },
  });

  // Format data cleanly and decrypt student phone numbers
  const students = await Promise.all(
    relations.map(async (rel) => {
      const student = rel.student;
      if (student.user && student.user.phone) {
        student.user.phone = looksEncrypted(student.user.phone) ? await decryptText({ text: student.user.phone }) : student.user.phone;
      }
      return student;
    })
  );

  res.status(200).json({ success: true, data: students });
});

// GET /parent/students/:studentId/homeworks
export const getStudentHomeworks = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  const homeworks = await db.findMany({
    model: "homework",
    where: { studentId },
    include: {
      subject: true,
      teacher: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    req,
    res,
    status: 200,
    data: homeworks,
  });
});

// GET /parent/students/:studentId/exams
export const getStudentExams = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  const exams = await db.findMany({
    model: "exam",
    where: { studentId },
    include: {
      subject: true,
      teacher: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    req,
    res,
    status: 200,
    data: exams,
  });
});

// GET /parent/students/:studentId/sessions
export const getStudentSessions = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  const sessions = await db.findMany({
    model: "schedule",
    where: { studentId },
    include: {
      subject: true,
      teacher: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      scheduleLogs: true,
    },
    orderBy: { start_time: "desc" },
  });

  return successResponse({
    req,
    res,
    status: 200,
    data: sessions,
  });
});

// GET /parent/students/:studentId/attendance
export const getStudentAttendance = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  const attendanceLogs = await db.findMany({
    model: "ScheduleLog",
    where: {
      schedule: {
        studentId,
      },
    },
    include: {
      schedule: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    req,
    res,
    status: 200,
    data: attendanceLogs,
  });
});

// GET /parent/notifications
export const getParentNotifications = asyncHandler(async (req, res, next) => {
  const parentId = req.user.id;

  const notifications = await db.findMany({
    model: "notification",
    where: { userId: parentId },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    req,
    res,
    status: 200,
    data: notifications,
  });
});
