import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../../Utils/Response.js";
import * as db from "../../../database/dbService.js";
import { ensureExists } from "../../../database/genericService.js";
import {
  decryptUserSensitiveFields,
  encryptPassword,
  encryptText,
} from "../../../Utils/Security/index.js";
import { redis } from "../../../Utils/Redis/Connection.js";
import { rbacCache } from "../../../Utils/RBAC/cache.js";

export const getAllStuff = asyncHandler(async (req, res, next) => {
  const { search, page = 1, limit = 10 } = req.query;

  const where = {};
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const { items: stuff, pagination } = await db.findManyWithPaginationAndCount({
    model: "stuff",
    where,
    page,
    limit,
    include: {
      user: true,
      role: true,
    },
  });

  await Promise.all(
    stuff.map((stuffUser) => decryptUserSensitiveFields(stuffUser.user)),
  );

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: { stuff, pagination },
  });
});

export const getStuffById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Single query with nested includes for permissions
  const stuff = await ensureExists({
    model: "stuff",
    where: { id },
    include: {
      user: true,
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
    message: "USER_NOT_FOUND",
  });

  const permissions =
    stuff.role?.rolePermissions.map((rp) => rp.permission) || [];

  await decryptUserSensitiveFields(stuff.user);

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: {
      stuff,
      permissions,
    },
  });
});

export const createStuffUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, code_country, roleId, age, city } = req.body;
  let codeCountry=code_country

  const [checkUserByEmail, checkRole] = await Promise.all([
    db.findOne({ model: "user", where: { email } }),
    roleId
      ? db.findOne({ model: "role", where: { id: roleId } })
      : Promise.resolve(null),
  ]);

  if (checkUserByEmail)
    return errorResponse({ req, next, message: "EMAIL_EXISTS", status: 400 });
  if (roleId && !checkRole)
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });

  const encryptedPassword = encryptPassword({ password });

  const result = await db.transaction([
    db.create({
      model: "user",
      data: {
        email,
        password: encryptedPassword,
        name,
        phone,
        code_country: codeCountry,
        roleId: roleId || null,
        status: "active",
        confirmAt: new Date(),
        age: age ? Number(age) : undefined,
        city: city || undefined,
      },
    }),
  ]);

  const user = result[0];

  const newStuff = await db.create({
    model: "stuff",
    data: {
      user: { connect: { id: user.id } },
      role: roleId ? { connect: { id: roleId } } : undefined,
    },
    include: { user: true, role: true },
  });

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    status: 201,
    data: newStuff,
  });
});

export const updateStuffUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, password, phone, code_country, roleId, age, city } = req.body;

  const stuff = await ensureExists({
    model: "stuff",
    where: { id },
    include: { user: true },
    message: "STAFF_NOT_FOUND",
  });

  if (email && email !== stuff.user.email) {
    const existing = await db.findOne({ model: "user", where: { email } });
    if (existing)
      return errorResponse({ req, next, message: "EMAIL_EXISTS", status: 400 });
  }



  const encryptedPassword = password
    ? encryptPassword({ password })
    : undefined;

  // Update user data
  if (name || email || encryptedPassword || phone || code_country || roleId !== undefined || age !== undefined || city !== undefined) {
    await db.updateOne({
      model: "user",
      where: { id: stuff.user_id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(encryptedPassword && { password: encryptedPassword }),
        ...(phone && { phone }),
        ...(code_country && { code_country }),
        ...(roleId !== undefined && { roleId }),
        ...(age !== undefined && { age: age ? Number(age) : null }),
        ...(city !== undefined && { city: city || null }),
      },
    });
  }

  const updatedStuff = await db.updateOne({
    model: "stuff",
    where: { id },
    data: {
      ...(roleId !== undefined && {
        role: roleId ? { connect: { id: roleId } } : { disconnect: true },
      }),
    },
    include: {
      user: true,
      role: true,
    },
  });

  await decryptUserSensitiveFields(updatedStuff.user);

  await rbacCache.invalidateUserCache(stuff.user_id);

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: updatedStuff,
  });
});

export const deleteStuffUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const stuff = await ensureExists({ model: "stuff", where: { id }, include: { role: true }, message: "STAFF_NOT_FOUND" });
  if (stuff.role?.name === "super_admin") {
    return errorResponse({ req, next, message: "SUPER_ADMIN_CANNOT_BE_DELETED", status: 400 });
  }

  // Delete user (cascades to stuff)
  await db.deleteOne({ model: "user", where: { id: stuff.user_id } });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
  });
});

export const registerParent = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    codeCountry,
    country,
    timezone,
    students,
    age,
    city,
  } = req.body;

  const checkUserByEmail = await db.findFirst({ model: "user", where: { email } });

  const userRole = await db.upsertOne({
    model: "role",
    where: { name: "parent" },
    update: {},
    create: {
      name: "parent",
    },
  });

  if (checkUserByEmail) {
    return errorResponse({ req, next, message: "EMAIL_EXISTS", status: 400 });
  }

  const encryptedPassword = encryptPassword({ password });
  const encryptedPhone = encryptText({ text: phone });

  await db.transaction(async (tx) => {
    const user = await tx.create({
      model: "user",
      data: {
        name,
        email,
        password: encryptedPassword,
        phone: encryptedPhone,
        code_country: codeCountry,
        timezone,
        roleId: userRole.id,
        confirmAt: new Date(),
        status: "active",
        age: age ? Number(age) : undefined,
        city: city || undefined,
      },
    });

    const parentStudents = await Promise.all(
      students.map(async (studentId) => {
        const checkStudent = await tx.findFirst({
          model: "student",
          where: { id: studentId },
        });

        if (!checkStudent) {
          return errorResponse({
            req,
            next,
            message: "STUDENT_NOT_FOUND",
            status: 404,
          });
        }

        const student = await tx.create({
          model: "parentStudent",
          data: {
            parent: { connect: { id: user.id } },
            student: { connect: { id: studentId } },
          },
        });
      }),
    );
  });

  return successResponse({
    res,
    req,
    status: 201,
    message: "PARENT_REGISTER_SUCCESS",
  });
});
