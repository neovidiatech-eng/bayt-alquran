import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { ensureExists } from "../../database/genericService.js";
import { decryptText, hash, looksEncrypted } from "../../Utils/Security/index.js";

export const getAllStudents = asyncHandler(async (req, res, next) => {
  const { search, country, plans, page = 1, limit = 10 } = req.query;

  const where = {};
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }
  if (country) {
    where.country = country;
  }
  if (plans) {
    where.planId = plans;
  }

  const { items: students, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "student",
      where,
      page,
      limit,
      include: {
        user: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        plan: true,
      },
    });
  const studentsData = await Promise.all(
    students.map(async (student) => {
      console.log(student.user.phone);

      const phone = looksEncrypted(student.user.phone)
        ? await decryptText({ text: student.user.phone })
        : student.user.phone;
      console.log(phone);
      return {
        ...student,
        user: {
          ...student.user,
          phone: phone,
        },
      };
    }),
  );

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: { studentsData, pagination },
    status: 200,
  });
});

export const createStudent = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    phone_code,
    country,
    planId,
    birth_date,
    gender,
    active,
    timezone,
  } = req.body;

  const [checkUserByEmail, checkUserByPhone, checkPlan, studentRole] =
    await Promise.all([
      db.findOne({ model: "user", where: { email } }),
      db.findFirst({ model: "user", where: { phone } }),
      db.findOne({ model: "Plans", where: { id: planId } }),
      db.findFirst({
        model: "role",
        where: { name: { equals: "student", mode: "insensitive" } },
      }),
    ]);

  if (checkUserByEmail)
    return errorResponse({
      req,
      next,
      message: "EMAIL_EXISTS",
      status: 400,
    });
  if (checkUserByPhone)
    return errorResponse({
      req,
      next,
      message: "PHONE_EXISTS",
      status: 400,
    });
  if (!checkPlan)
    return errorResponse({ req, next, message: "PLAN_NOT_FOUND", status: 404 });

  const hashedPassword = await hash({ password });

  // Fetch system wallet before the transaction so we can reference its id inside
  const systemWallet = await db.findFirst({
    model: "wallet",
    where: { type: "system" },
  });

  if (!systemWallet) {
    return errorResponse({
      req,
      next,
      message: "SYSTEM_WALLET_NOT_FOUND",
      status: 500,
    });
  }

  await db.transaction(async (tx) => {
    // 1. Create user
    const user = await tx.create({
      model: "user",
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        code_country: phone_code,
        status: "active",
        confirmAt: new Date(),
        timezone,
        ...(studentRole && { roleId: studentRole.id }),
      },
    });

    // 2. Create student profile
    await tx.create({
      model: "student",
      data: {
        user: { connect: { id: user.id } },
        country,
        plan: { connect: { id: planId } },
        birth_date: new Date(birth_date),
        gender,
        active: active ?? false,
        status: "approved",
        sessions: checkPlan.sessionsCount,
        sessions_attended: 0,
        sessions_remaining: checkPlan.sessionsCount,
      },
    });

    // 3. Create subscription record
    const subscription = await tx.create({
      model: "Subscription",
      data: {
        userId: user.id,
        planId,
        status: "active",
        amount: parseFloat(checkPlan.price) || 0,
        currencyId: checkPlan.currencyId,
        startDate: new Date(),
        paidAt: new Date(),
      },
    });

    const amount = parseFloat(checkPlan.price) || 0;

    // 4. Create ledger transaction record
    await tx.create({
      model: "Transaction",
      data: {
        walletId: systemWallet.id,
        type: "subscription",
        amount,
        status: "completed",
        reason: `subscription for ${user.name}`,
        subscriptionId: subscription.id,
      },
    });

    // 5. Increment system wallet balance
    await tx.updateOne({
      model: "Wallet",
      where: { id: systemWallet.id },
      data: { balance: { increment: amount } },
    });
  });

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    status: 201,
  });
});

export const getStudentById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [student, studentTeachers] = await Promise.all([
    ensureExists({
      model: "student",
      where: { id },
      include: {
        user: true,
        plan: true,
      },
      message: "STUDENT_NOT_FOUND",
    }),
    db.findMany({
      model: "schedule",
      where: { studentId: id },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        subject: true,
      },
    }),
  ]);
  if (student) {
    const uniqueTeachers = [
      ...new Set(studentTeachers.map((teacher) => teacher.teacher.id)),
    ].map((id) => {
      return {
        id,
        name: studentTeachers.find((teacher) => teacher.teacher.id === id)
          .teacher.user.name,
        email: studentTeachers.find((teacher) => teacher.teacher.id === id)
          .teacher.user.email,
        phone: studentTeachers.find((teacher) => teacher.teacher.id === id)
          .teacher.user.phone,
      };
    });
    student.teachers = uniqueTeachers;
  }
  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: student,
    status: 200,
  });
});

export const updateStudent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    phone_code,
    country,
    planId,
    birth_date,
    gender,
    active,
    timezone,
  } = req.body;

  const student = await ensureExists({
    model: "student",
    where: { id },
    include: { user: true },
  });

  // Handle unique constraints for user
  if (email && email !== student.user.email) {
    const existing = await db.findOne({ model: "user", where: { email } });
    if (existing)
      return errorResponse({
        req,
        next,
        message: "EMAIL_EXISTS",
        status: 400,
      });
  }

  if (phone && phone !== student.user.phone) {
    const existing = await db.findFirst({ model: "user", where: { phone } });
    if (existing)
      return errorResponse({
        req,
        next,
        message: "PHONE_EXISTS",
        status: 400,
      });
  }

  if (planId && planId !== student.planId) {
    const plan = await db.findOne({ model: "Plans", where: { id: planId } });
    if (!plan)
      return errorResponse({
        req,
        next,
        message: "PLAN_NOT_FOUND",
        status: 404,
      });
  }

  // Update user record if needed
  if (name || email || phone || phone_code || timezone) {
    await db.updateOne({
      model: "user",
      where: { id: student.user_id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(phone_code && { code_country: phone_code }),
        ...(timezone && { timezone }),
      },
    });
  }

  const updatedStudent = await db.updateOne({
    model: "student",
    where: { id },
    data: {
      ...(country && { country }),
      ...(planId && { plan: { connect: { id: planId } } }),
      ...(birth_date && { birth_date: new Date(birth_date) }),
      ...(gender && { gender }),
      ...(active !== undefined && { active }),
    },
    include: { user: true, plan: true },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: updatedStudent,
    status: 200,
  });
});

export const deleteStudent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const student = await ensureExists({ model: "student", where: { id } });

  // Delete user (cascades to student)
  await db.deleteOne({ model: "user", where: { id: student.user_id } });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
  });
});
