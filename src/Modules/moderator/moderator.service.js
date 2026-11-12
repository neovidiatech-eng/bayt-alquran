import prisma from "../../database/Connection.db.js";
import * as db from "../../database/dbService.js";
import { baseRoles } from "../../Utils/Enums/roles.js";
import { redis } from "../../Utils/Redis/Connection.js";
import { sendEmail } from "../../Utils/Mailer/SendEmail.js";
import { generateOtp } from "../../Utils/Security/otp.js";
import {
  decryptUserSensitiveFields,
  encryptPassword,
  encryptText,
  hash,
} from "../../Utils/Security/index.js";
import { activeStatus } from "../../Utils/Enums/status.js";

export const getAllModerators = async (req) => {
  const {
    page = 1,
    limit = 10,
    search,
    orderBy: orderByQuery,
    order,
  } = req.query;
  const where = {
    status: activeStatus.ACTIVE,
    user: {
      status: activeStatus.ACTIVE,
      roleId: { not: null },
    },
  };
  let orderBy = {};

  if (search?.trim()) {
    const value = search.trim();
    where.user = {
      status: activeStatus.ACTIVE,
      roleId: { not: null },
      OR: [
        { name: { contains: value, mode: "insensitive" } },
        { email: { contains: value, mode: "insensitive" } },
      ],
    };
  }

  if (orderByQuery === "createdAt") {
    orderBy = {
      createdAt: order === "asc" ? "asc" : "desc",
    };
  } else if (orderByQuery === "active") {
    orderBy = {
      status: order === "asc" ? "asc" : "desc",
    };
  } else {
    // Default sorting
    orderBy = {
      createdAt: "desc",
    };
  }

  const moderators = await db.findManyWithPaginationAndCount({
    model: "moderator",
    page,
    limit,
    where,
    orderBy,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          phone: true,
          status: true,
        },
      },
      studentModerators: {
        include: {
          student: true,
        },
      },
    },
  });

  await Promise.all(
    moderators.items.map((moderator) =>
      decryptUserSensitiveFields(moderator.user),
    ),
  );

  return moderators;
};

export const getModeratorById = async (req) => {
  const { id } = req.params;
  const moderator = await db.findOne({
    model: "moderator",
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          phone: true,
          age: true,
          code_country: true,
          status: true,
          createdAt: true,
        },
      },
      studentModerators: {
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
            },
          },
        },
      },
    },
  });

  if (!moderator) {
    const error = new Error("MODERATOR_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  await decryptUserSensitiveFields(moderator.user);

  return moderator;
};

export const createModerator = async (req) => {
  const {
    name,
    email,
    password,
    phone,
    age,
    gender,
    salary,
    studentIds,
    codeCountry: code_country,
  } = req.body;

  const [existingUser, role, students] = await Promise.all([
    db.findOne({ model: "user", where: { email } }),
    db.findOne({ model: "role", where: { name: baseRoles.MODERATOR } }),
    db.findMany({ model: "student", where: { id: { in: studentIds } } }),
  ]);
  if (students.length !== studentIds.length) {
    const missingStudents = studentIds.filter(
      (id) => !students.some((s) => s.id === id),
    );
    const error = new Error("STUDENTS_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  if (existingUser) {
    const error = new Error("EMAIL_EXISTS");
    error.cause = 400;
    error.statusCode = 400;
    throw error;
  }

  if (!role) {
    const error = new Error("ROLE_NOT_FOUND");
    error.cause = 400;
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = password ? encryptPassword({ password }) : undefined;
  const mappedStudents = students.map((student) => ({
    studentId: student.id,
  }));

  const moderator = await db.create({
    model: "moderator",
    data: {
      gender,
      ...(salary !== undefined && { salary: Number(salary) }),
      user: {
        create: {
          name,
          email,
          password: hashedPassword,
          phone,
          age,
          code_country,
          status: "active",
          confirmAt: new Date(),
          role: {
            connect: {
              id: role.id,
            },
          },
        },
      },
      ...(mappedStudents.length > 0 && {
        studentModerators: { create: mappedStudents },
      }),
    },
  });

  return moderator;
};

export const updateModerator = async (req) => {
  const { id } = req.params;
  const {
    name,
    email,
    password,
    phone,
    age,
    gender,
    salary,
    status,
    studentIds,
    codeCountry: code_country,
  } = req.body;

  const moderator = await db.findOne({
    model: "moderator",
    where: { id },
    include: { user: true },
  });

  if (!moderator) {
    const error = new Error("MODERATOR_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  if (email && email !== moderator.user.email) {
    const existingUser = await db.findOne({ model: "user", where: { email } });
    if (existingUser) {
      const error = new Error("EMAIL_EXISTS");
      error.cause = 400;
      error.statusCode = 400;
      throw error;
    }
  }

  // Update user model fields
  const userDataToUpdate = {};
  if (name !== undefined) userDataToUpdate.name = name;
  if (email !== undefined) userDataToUpdate.email = email;
  if (phone !== undefined) userDataToUpdate.phone = phone;
  if (age !== undefined) userDataToUpdate.age = age;
  if (code_country !== undefined) userDataToUpdate.code_country = code_country;
  if (status !== undefined) userDataToUpdate.status = status;
  if (password) {
    userDataToUpdate.password = encryptPassword({ password });
  }

  if (Object.keys(userDataToUpdate).length > 0) {
    await db.updateOne({
      model: "user",
      where: { id: moderator.userId },
      data: userDataToUpdate,
    });
  }

  // Update moderator model fields
  const modDataToUpdate = {};
  if (gender !== undefined) modDataToUpdate.gender = gender;
  if (salary !== undefined) modDataToUpdate.salary = Number(salary);
  if (status !== undefined) modDataToUpdate.status = status;

  if (Object.keys(modDataToUpdate).length > 0) {
    await db.updateOne({
      model: "moderator",
      where: { id },
      data: modDataToUpdate,
    });
  }

  // Sync studentModerators if studentIds provided
  if (Array.isArray(studentIds)) {
    await db.deleteMany({
      model: "student_moderator",
      where: { moderatorId: id },
    });

    if (studentIds.length > 0) {
      const students = await db.findMany({
        model: "student",
        where: { id: { in: studentIds } },
      });

      for (const student of students) {
        await db.create({
          model: "student_moderator",
          data: {
            moderatorId: id,
            studentId: student.id,
          },
        });
      }
    }
  }

  if (moderator.userId) {
    try {
      await redis.del(`user:${moderator.userId}`);
    } catch (e) {
      console.error("Redis Cache Del Error:", e.message);
    }
  }

  return await getModeratorById(req);
};

export const deleteModerator = async (req) => {
  const { id } = req.params;

  const moderator = await db.findOne({
    model: "moderator",
    where: { id },
  });

  if (!moderator) {
    const error = new Error("MODERATOR_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  // Deleting user automatically cascades to moderator & student_moderator
  await db.deleteOne({
    model: "user",
    where: { id: moderator.userId },
  });

  try {
    await redis.del(`user:${moderator.userId}`);
  } catch (e) {
    console.error("Redis Cache Del Error:", e.message);
  }

  return { id };
};
export const getAllStudents = async (req) => {
  const { page, limit, search, orderByQuery, order } = req.query;
  const userId = req.user?.moderator?.id;
  let where = {};
  let orderBy = {};

  if (!userId) {
    const error = new Error("MODERATOR_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  where.moderatorId = userId;

  if (search?.trim()) {
    const value = search.trim();
    where.student = {
      user: {
        OR: [
          { name: { contains: value, mode: "insensitive" } },
          { email: { contains: value, mode: "insensitive" } },
        ],
      },
    };
  }

  if (orderByQuery === "createdAt") {
    orderBy = {
      createdAt: order === "asc" ? "asc" : "desc",
    };
  } else if (orderByQuery === "active") {
    orderBy = {
      status: order === "asc" ? "asc" : "desc",
    };
  } else {
    // Default sorting
    orderBy = {
      createdAt: "desc",
    };
  }

  const students = await db.findManyWithPaginationAndCount({
    model: "student_moderator",
    where,
    include: {
      student: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              age: true,
              code_country: true,
              status: true,
              createdAt: true,
              id: true,
            },
          },
        },
      },
    },
  });

  console.log({ students });

  return { students };
};
export const changeStatus = async (req) => {
  const { id, status } = req.body;

  const moderator = await db.findOne({
    model: "moderator",
    where: { id },
    include: { user: true },
  });

  if (!moderator) {
    const error = new Error("MODERATOR_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  await db.transaction(async (tx) => {
    await tx.updateOne({
      model: "moderator",
      where: { id },
      data: { status },
    });
    await tx.updateOne({
      model: "user",
      where: { id: moderator.userId },
      data: { status },
    });
  });

  return { id, status };
};

export const signUpModerator = async ({
  name,
  email,
  password,
  codeCountry,
  phone,
  expectedSalary,
  gender,
  country,
  nationality,
  timezone,
  city,
  age,
  notes,
  additionalData,
  lang = "ar",
}) => {
  const existingUser = await db.findFirst({ model: "user", where: { email } });
  if (existingUser) {
    const error = new Error("EMAIL_EXISTS");
    error.cause = 400;
    error.statusCode = 400;
    throw error;
  }

  if (notes) {
    additionalData = { ...(additionalData || {}), notes };
  }

  // 2. Preparation (Hashing, Encryption, OTP)
  const encryptedPassword = encryptPassword({ password });
  const encryptedPhone = encryptText({ text: phone });
  const otp = generateOtp();
  const hashedOtp = await hash({ password: otp });

  // 3. Redis OTP Setup
  await redis.set(`${email}_otp_register`, hashedOtp);
  await redis.expire(`${email}_otp_register`, 60 * 10);
  await redis.set(`${email}_otp_attempts`, 0, { EX: 60 * 10 });

  // 4. Send Verification Email
  const mailResult = await sendEmail({ email, otp, lang });
  if (!mailResult.success) {
    const errorMsg =
      mailResult.code === "ETIMEDOUT"
        ? "EMAIL_SERVICE_TIMEOUT"
        : "EMAIL_SEND_FAILED";
    const error = new Error(errorMsg);
    error.cause = 500;
    error.statusCode = 500;
    throw error;
  }

  // 5. Create unconfirmed user record + store Moderator snapshot in Redis
  let createdUser;
  await db.transaction(async (tx) => {
    createdUser = await tx.create({
      model: "user",
      data: {
        name,
        email,
        password: encryptedPassword,
        phone: encryptedPhone,
        code_country: codeCountry,
        country,
        nationality,
        timezone,
        age: age ? Number(age) : undefined,
        city: city || undefined,
        additionalData: additionalData || undefined,
        status: "pending",

        // No roleId / confirmAt — confirmed after OTP, fully activated after admin approval
      },
    });

    await redis.set(
      `${email}_Moderator_data`,
      JSON.stringify({
        user_id: createdUser.id,
        gender: gender || "male",
        expectedSalary,
      }),
    );
    await redis.expire(`${email}_Moderator_data`, 60 * 60 * 24 * 2);
  });

  return { email, userId: createdUser.id };
};

export const getModeratorRequests = async (req) => {
  const { page = 1, limit = 20 } = req.query;

  const { items: requests, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "user",
      where: {
        confirmAt: { not: null },
        OR: [
          { roleId: null, moderator: { isNot: null } },
          { moderator: { status: "pending" } },
        ],
      },
      page,
      limit,
      include: {
        moderator: {
          include: {
            studentModerators: { include: { student: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

  await Promise.all(requests.map((r) => decryptUserSensitiveFields(r)));

  const allRedisData = await Promise.all(
    requests.map(async (r) => {
      const redisKey = `${r.email}_Moderator_data`;
      const redisData = await redis.get(redisKey);

      return { ...r, redisData: redisData ? JSON.parse(redisData) : null };
    }),
  );

  return { allRedisData, pagination };
};

export const approveModeratorRequest = async (req) => {
  const { userId } = req.params;
  const { studentIds, salary } = req.body || {};

  const user = await db.findFirst({
    model: "user",
    where: { id: userId },
    include: { moderator: true },
  });

  if (!user || !user.moderator) {
    const error = new Error("MODERATOR_REQUEST_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  const moderatorRole = await db.findFirst({
    model: "role",
    where: { name: baseRoles.MODERATOR },
  });
  if (!moderatorRole) {
    const error = new Error("ROLE_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    const students = await db.findMany({
      model: "student",
      where: { id: { in: studentIds } },
    });
    if (students.length !== studentIds.length) {
      const error = new Error("STUDENTS_NOT_FOUND");
      error.cause = 404;
      error.statusCode = 404;
      throw error;
    }
  }
  const updatedModerator = await db.transaction(async (tx) => {
    await tx.updateOne({
      model: "user",
      where: { id: user.id },
      data: {
        role: { connect: { id: moderatorRole.id } },
        status: "active",
      },
    });

    const approvedMod = await tx.updateOne({
      model: "moderator",
      where: { id: user.moderator.id },
      data: {
        status: "active",
        ...(salary !== undefined && { salary: Number(salary) }),
        ...(Array.isArray(studentIds) &&
          studentIds.length > 0 && {
            studentModerators: {
              create: studentIds.map((sid) => ({ studentId: sid })),
            },
          }),
      },
      include: {
        user: true,
        studentModerators: { include: { student: true } },
      },
    });

    return approvedMod;
  });

  try {
    await redis.del(`user:${user.id}`);
  } catch (e) {
    console.error("Redis Cache Del Error:", e.message);
  }

  await decryptUserSensitiveFields(updatedModerator.user);
  return updatedModerator;
};

export const rejectModeratorRequest = async (req) => {
  const { userId } = req.params;

  const user = await db.findFirst({
    model: "user",
    where: { id: userId },
    include: { moderator: true },
  });

  if (!user || !user.moderator) {
    const error = new Error("MODERATOR_REQUEST_NOT_FOUND");
    error.cause = 404;
    error.statusCode = 404;
    throw error;
  }

  await db.deleteOne({ model: "user", where: { id: user.id } });
  return { id: userId };
};
