import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { ensureExists } from "../../database/genericService.js";
import {
  decryptUserSensitiveFields,
  encryptPassword,
} from "../../Utils/Security/index.js";
import { createAdminNotification } from "../Notifications/notifications.controller.js";
import { studentPaidStatus } from "../../Utils/Enums/studentts.js";
import { getModeratorStudentIds } from "../../Utils/Permissions/permissions.js";

export const getAllStudents = asyncHandler(async (req, res, next) => {
  const { search, country, plans, page = 1, limit = 10, active, paid ,noPlan} = req.query;

  const where = {};
  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null) {
    where.id = { in: assignedStudentIds };
  }

  if (search?.trim()) {
    const value = search.trim();
    where.user = {
      OR: [
        { name: { contains: value, mode: "insensitive" } },
        { email: { contains: value, mode: "insensitive" } },
      ],
    };
  }
  if (country) {
    where.country = country;
  }
  if (plans) {
    where.planId = plans;
  }
  if (noPlan !== undefined) {
    const isNoPlan = noPlan === "true" || noPlan === true;
    if (isNoPlan) {
      where.planId = null;
    }
  }
  if (active !== undefined) {
    where.active = active === "true" || active === true;
  }
  if (paid) {
    where.paid = paid;
  }

  const countWhere =
    assignedStudentIds !== null ? { id: { in: assignedStudentIds } } : {};

  const [{ items: students, pagination }, totalCount, activeCount, unpaidCount] =
    await Promise.all([
      db.findManyWithPaginationAndCount({
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
          rank: true,
        },
      }),
      db.count({ model: "student", where: countWhere }),
      db.count({ model: "student", where: { ...countWhere, active: true } }),
      db.count({
        model: "student",
        where: { ...countWhere, paid: studentPaidStatus.Unpaid },
      }),
    ]);

  const studentsData = await Promise.all(
    students.map(async (student) => {
      await decryptUserSensitiveFields(student.user);
      return {
        ...student,
        user: {
          ...student.user,
        },
      };
    }),
  );

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: {
      studentsData,
      pagination,
      totalCount,
      activeCount,
      unpaidCount,
      inactiveCount: totalCount - activeCount,
    },
    status: 200,
  });
});

/* export const getStudentsStats = asyncHandler(async (req, res, next) => {
  const [totalCount, activeCount,unpaidCount] = await Promise.all([
    db.count({ model: "student" }),
    db.count({ model: "student", where: { active: true } }),
    db.count({ model: "student", where: { paid: studentPaidStatus.Unpaid } }),
  ]);

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: {
      totalCount,
      activeCount,
      unpaidCount,
      inactiveCount: totalCount - activeCount,
    },
    status: 200,
  });
}); */

export const createStudent = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    phone_code,
    country,
    nationality,
    planId,
    birth_date,
    gender,
    active,
    timezone,
    age,
    city,
    paid,
  } = req.body;

  let checkPlan;


  const [checkUserByEmail, studentRole] = await Promise.all([
    db.findOne({ model: "user", where: { email } }),

    db.findFirst({
      model: "role",
      where: { name: { equals: "student", mode: "insensitive" } },
    }),
  ]);

  if (planId) {
    checkPlan = await db.findOne({
      model: "Plans",
      where: { id: planId },
      include: {
        currency: true,
      },
    });
    if (!checkPlan)
      return errorResponse({
        req,
        next,
        message: "PLAN_NOT_FOUND",
        status: 404,
      });
  }

  if (checkUserByEmail)
    return errorResponse({
      req,
      next,
      message: "EMAIL_EXISTS",
      status: 400,
    });

  const encryptedPassword = encryptPassword({ password });

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
        password: encryptedPassword,
        code_country: phone_code,
        country,
        nationality,
        status: "active",
        confirmAt: new Date(),
        timezone,
        age: age ? Number(age) : undefined,
        city: city || undefined,
        ...(studentRole && { roleId: studentRole.id }),
      },
    });

    // 2. Create student profile
    await tx.create({
      model: "student",
      data: {
        user: { connect: { id: user.id } },
        country,
        plan: planId ? { connect: { id: planId } } : undefined,
        birth_date: new Date(birth_date),
        gender,
        active: active ?? false,
        status: "approved",
        sessions: checkPlan?.sessionsCount || 0,
        sessions_attended: 0,
        sessions_remaining: checkPlan?.sessionsCount || 0,
        paid
      },
    });

    // 3. Create subscription record
  });

  await createAdminNotification({
    title: "تم اضافة طالب جديد",
    message: `تم اضافة طالب جديد: ${name} (${email}).`,
    type: "new_student",
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

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  if (assignedStudentIds !== null && !assignedStudentIds.includes(id)) {
    return errorResponse({
      req,
      next,
      status: 403,
      message: "FORBIDDEN",
    });
  }

  const [student, studentTeachers] = await Promise.all([
    ensureExists({
      model: "student",
      where: { id },
      include: {
        user: true,
        plan: true,
        rank: true,
      },
      message: "STUDENT_NOT_FOUND",
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
          include: {
            user: true,
          },
        },
        subject: true,
      },
    }),
  ]);
  if (student) {
    await decryptUserSensitiveFields(student.user);
    await Promise.all(
      studentTeachers.map((teacher) =>
        decryptUserSensitiveFields(teacher.teacher.user),
      ),
    );

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
    nationality,
    planId,
    birth_date,
    gender,
    active,
    timezone,
    password,
    age,
    city,
    paid,
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
  let encryptedPassword;

  password ? (encryptedPassword = encryptPassword({ password })) : null;

  // Update user record if needed
  if (
    name ||
    email ||
    phone ||
    phone_code ||
    country ||
    nationality ||
    timezone ||
    password ||
    age !== undefined ||
    city !== undefined ||
    paid !== undefined
  ) {
    await db.updateOne({
      model: "user",
      where: { id: student.user_id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(phone_code && { code_country: phone_code }),
        ...(country && { country }),
        ...(nationality && { nationality }),
        ...(timezone && { timezone }),
        ...(password && { password: encryptedPassword }),
        ...(age !== undefined && { age: age ? Number(age) : null }),
        ...(city !== undefined && { city: city || null }),
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
      ...(paid !== undefined && { paid }),
    },
    include: { user: true, plan: true },
  });

  await decryptUserSensitiveFields(updatedStudent.user);

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

export const updateStudentPlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { planId } = req.body;
  let plan;
  console.log(req.lang);
  

  const student = await ensureExists({
    model: "student",
    where: { id },
    include: {
      user: true,
      plan: true,
    },
    message: "STUDENT_NOT_FOUND",
  });

  console.log(student);
  
  if( student.sessions_attended > 0 ){
    return errorResponse({
      req,
      next,
      message: "STUDENT_ALREADY_HAVE_SESSIONS",
      status: 404,
    });
  }

  if (planId && planId === student.planId ) {
    return errorResponse({
      req,
      next,
      message: "STUDENT_ALREADY_HAVE_PLAN",
      status: 404,
    });
  }

  if (planId) {
    plan = await db.findOne({ model: "Plans", where: { id: planId } });

    if (!plan)
      return errorResponse({
        req,
        next,
        message: "PLAN_NOT_FOUND",
        status: 404,
      });
  }

  const updatedStudent = await db.transaction(async (tx) => {
    const student = await tx.updateOne({
      model: "student",
      where: { id },
      data: {
        plan: { connect: { id: planId } },
        sessions: plan?.sessionsCount || 0,
        sessions_attended: 0,
        sessions_remaining: plan?.sessionsCount || 0,
      },
      include: { user: true, plan: true },
    });
    const subscription = await tx.create({
      model: "Subscription",
      data: {
        userId: student.user_id,
        planId,
        status: "active",
        amount: parseFloat(plan?.price) || 0,
        currencyId: plan?.currencyId,
        startDate: new Date(),
        paidAt: new Date(),
      },
    });

    const amount = parseFloat(plan?.price) || 0;
    
    const systemWallet = await tx.findFirst({
      model: "Wallet",
      where: { type: "system" },
    });

    const reason = {
      en: `Subscription for ${student.user.name}`,
      ar: `اشتراك للطالب ${student.user.name}`,
    };

    // 4. Create ledger transaction record
    await tx.create({
      model: "Transaction",
      data: {
        walletId: systemWallet.id,
        type: "subscription",
        amount,
        status: "completed",
        reason, 
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

  await decryptUserSensitiveFields(student.user);

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: updatedStudent,
    status: 200,
  });
});
