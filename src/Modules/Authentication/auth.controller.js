import { googleVerify } from "../../Utils/GoogleClient/index.js";
import sendEmailEvent from "../../Utils/Mailer/sendEmailEvent.js";
import { redis } from "../../Utils/Redis/Connection.js";
import * as db from "../../database/dbService.js";
import { createAdminNotification } from "../Notifications/notifications.controller.js";

import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import {
  compare,
  decryptText,
  decryptUserSensitiveFields,
  encryptPassword,
  encryptText,
  hash,
  looksEncrypted,
  verifyPassword,
} from "../../Utils/Security/index.js";
import { generateOtp } from "../../Utils/Security/otp.js";
import { sendEmail } from "../../Utils/Mailer/SendEmail.js";
import { generateToken, verifyToken } from "../../Utils/Token/token.js";
import { activeStatus } from "../../Utils/Enums/status.js";

/* -------------------------------------------- ------------------------------ */
/*                                SIGN IN AND SIGN UP                           */
/* -------------------------------------------------------------------------- */
export const register = asyncHandler(async (req, res, next) => {
  const {
    name,
    age,
    city,
    email,
    password,
    phone,
    codeCountry,
    plan_id,
    birth_date,
    gender,
    country,
    nationality,
    timezone,
  } = req.body;

  // 1. Initial validations (Check existence outside transaction to keep it short)
  const checkUserByEmail = await db.findFirst({
    model: "user",
    where: { email },
  });

  const userRole = await db.findFirst({
    model: "role",
    where: { name: "student" },
  });

  if (!userRole) {
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
  }

  if (checkUserByEmail) {
    return errorResponse({ req, next, message: "EMAIL_EXISTS", status: 400 });
  }

  if (plan_id) {
    const exitsPlan = await db.findFirst({
      model: "Plans",
      where: { id: plan_id },
    });
    if (!exitsPlan) {
      return errorResponse({
        req,
        next,
        message: "PLAN_NOT_FOUND",
        status: 404,
      });
    }
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
  const mailResult = await sendEmail({ email, otp, lang: req.lang });

  if (!mailResult.success) {
    const errorMsg =
      mailResult.code === "ETIMEDOUT"
        ? "EMAIL_SERVICE_TIMEOUT"
        : "EMAIL_SEND_FAILED";
    return errorResponse({ req, next, message: errorMsg, status: 500 });
  }

  // 5. Transactional Database Operations
  await db.transaction(async (tx) => {
    // Create User record
    const user = await tx.create({
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
        roleId: userRole?.id ? userRole.id : null,
      },
    });

    // Store Student metadata in Redis
    await redis.set(
      `${email}_Student_data`,
      JSON.stringify({
        name,
        email,
        password: encryptedPassword,
        phone: encryptedPhone,
        code_country: codeCountry,
        birth_date,
        gender,
        country,
        nationality,
        timezone,
        user_id: user.id,
        age: age ? Number(age) : undefined,
        city: city || undefined,
      }),
    );
    await redis.expire(`${email}_Student_data`, 60 * 60 * 24);

    // Create Subscription Request if a plan is selected
    if (plan_id) {
      await tx.create({
        model: "subscription_requests",
        data: {
          user_id: user.id,
          planId: plan_id,
        },
      });
    }
  });

  return successResponse({
    res,
    req,
    status: 201,
    userRole,
    message: "REGISTER_SUCCESS_CHECK_EMAIL",
  });
});

/* -------------------------------------------------------------------------- */
/*                          TEACHER SELF-REGISTRATION                          */
/* -------------------------------------------------------------------------- */
export const registerTeacher = asyncHandler(async (req, res, next) => {
  let {
    name,
    email,
    password,
    phone,
    codeCountry,
    gender,
    country,
    nationality,
    timezone,
    age,
    city,
    notes,
    additionalData,
  } = req.body;

  // 1. Check email uniqueness
  const existingUser = await db.findFirst({ model: "user", where: { email } });
  if (existingUser) {
    return errorResponse({ req, next, message: "EMAIL_EXISTS", status: 400 });
  }
  if (notes) {
    additionalData = { ...additionalData, notes };
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
  const mailResult = await sendEmail({ email, otp, lang: req.lang });
  /*   if (!mailResult.success) {
    const errorMsg =
      mailResult.code === "ETIMEDOUT" ? "EMAIL_SERVICE_TIMEOUT" : "EMAIL_SEND_FAILED";
    return errorResponse({ req, next, message: errorMsg, status: 500 });
  }
 */
  // 5. Create unconfirmed user record + store Teacher snapshot in Redis
  await db.transaction(async (tx) => {
    const user = await tx.create({
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

    // Store only teacher-specific fields; currency/subjects are set on admin approval
    await redis.set(
      `${email}_Teacher_data`,
      JSON.stringify({ user_id: user.id, gender }),
    );
    await redis.expire(`${email}_Teacher_data`, 60 * 60 * 24 * 2);
  });

  return successResponse({
    res,
    req,
    status: 201,
    message: "REGISTER_SUCCESS_CHECK_EMAIL",
  });
});

const USER_LOGIN_INCLUDE = {
  teacher: true,
  student: true,
  moderator: true,
  role: {
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  },
  subscriptionRequests: true,
};

const normalizePhoneDigits = (value = "") => String(value).replace(/\D/g, "");

const doesPhoneMatch = ({
  storedPhone,
  storedCodeCountry,
  inputDigits,
  inputCodeDigits,
}) => {
  if (!storedPhone || !inputDigits) return false;

  const userDigits = normalizePhoneDigits(storedPhone);
  if (!userDigits) return false;

  const userCodeDigits = normalizePhoneDigits(storedCodeCountry);

  if (inputCodeDigits) {
    if (userCodeDigits && userCodeDigits !== inputCodeDigits) {
      return false;
    }
    if (userDigits === inputDigits) return true;
    if (
      userDigits.length >= 8 &&
      userDigits.replace(/^0+/, "") === inputDigits.replace(/^0+/, "")
    ) {
      return true;
    }
    return false;
  }

  if (inputDigits === userDigits) return true;
  if (userCodeDigits) {
    if (inputDigits === `${userCodeDigits}${userDigits}`) return true;
    if (
      userDigits.startsWith("0") &&
      inputDigits === `${userCodeDigits}${userDigits.slice(1)}`
    ) {
      return true;
    }
    if (
      !userDigits.startsWith("0") &&
      inputDigits === `${userCodeDigits}0${userDigits}`
    ) {
      return true;
    }
  }
  if (userDigits.length >= 8) {
    if (
      inputDigits.startsWith("0") &&
      !userDigits.startsWith("0") &&
      inputDigits.slice(1) === userDigits
    ) {
      return true;
    }
    if (
      userDigits.startsWith("0") &&
      !inputDigits.startsWith("0") &&
      userDigits.slice(1) === inputDigits
    ) {
      return true;
    }
  }

  return false;
};

const findUserByLoginIdentifier = async ({
  email,
  phone,
  identifier,
  emailOrPhone,
  codeCountry,
  password,
}) => {
  const loginValue = (
    phone ||
    email ||
    identifier ||
    emailOrPhone ||
    ""
  ).trim();

  if (!loginValue) return null;

  // Treat as email when explicit email (not overridden by phone) contains '@'
  const isEmailLookup = !phone && loginValue.includes("@");
  if (isEmailLookup) {
    return await db.findFirst({
      model: "user",
      where: {
        email: { equals: loginValue, mode: "insensitive" },
      },
      include: USER_LOGIN_INCLUDE,
    });
  }

  // Phone lookup: decrypt AES-encrypted phones or match plain text phones
  const inputDigits = normalizePhoneDigits(loginValue);
  const inputCodeDigits = normalizePhoneDigits(codeCountry);
  if (!inputDigits) return null;

  const usersWithPhones = await db.findMany({
    model: "user",
    where: { phone: { not: null } },
    select: { id: true, phone: true, code_country: true },
  });

  const matchedIds = [];
  for (const u of usersWithPhones) {
    const plainPhone = looksEncrypted(u.phone)
      ? await decryptText({ text: u.phone })
      : u.phone;

    if (
      doesPhoneMatch({
        storedPhone: plainPhone,
        storedCodeCountry: u.code_country,
        inputDigits,
        inputCodeDigits,
      })
    ) {
      matchedIds.push(u.id);
    }
  }

  if (matchedIds.length === 0) return null;

  if (matchedIds.length === 1) {
    return await db.findFirst({
      model: "user",
      where: { id: matchedIds[0] },
      include: USER_LOGIN_INCLUDE,
    });
  }

  // If multiple accounts share the same phone, prefer active + confirmed + matching password
  const candidates = await db.findMany({
    model: "user",
    where: { id: { in: matchedIds } },
    include: USER_LOGIN_INCLUDE,
  });

  let passwordMatchCandidate = null;
  for (const candidate of candidates) {
    if (!candidate.password) continue;
    const isMatch = await verifyPassword({
      password,
      storedPassword: candidate.password,
    });
    if (isMatch) {
      if (candidate.confirmAt && candidate.status === activeStatus.ACTIVE) {
        return candidate;
      }
      if (!passwordMatchCandidate) {
        passwordMatchCandidate = candidate;
      }
    }
  }

  return (
    passwordMatchCandidate ||
    candidates.find((c) => c.confirmAt) ||
    candidates[0]
  );
};

export const login = asyncHandler(async (req, res, next) => {
  const {
    email,
    phone,
    identifier,
    emailOrPhone,
    codeCountry,
    code_country,
    password,
  } = req.body;

  const trimmedLogin = (
    phone ||
    email ||
    identifier ||
    emailOrPhone ||
    ""
  ).trim();

  if (!trimmedLogin || !password) {
    return errorResponse({
      req,
      next,
      message: "MISSING_CREDENTIALS",
      status: 400,
    });
  }

  const user = await findUserByLoginIdentifier({
    email: email?.trim(),
    phone: phone?.trim(),
    identifier: identifier?.trim(),
    emailOrPhone: emailOrPhone?.trim(),
    codeCountry: (codeCountry || code_country)?.trim(),
    password,
  });
  if (!user?.confirmAt) {
    return errorResponse({
      req,
      next,
      message: "USER_NOT_CONFIRMED",
      status: 401,
    });
  }
  const subscription_request = user?.subscriptionRequests?.find(
    (req) => req.status === "pending",
  );

  if (subscription_request) {
    return errorResponse({
      req,
      next,
      message: "USER_ALREADY_HAVE_PENDING_SUBSCRIPTION_REQUEST",
      status: 400,
    });
  }

  if (user.status !== activeStatus.ACTIVE) {
    return errorResponse({
      req,
      next,
      message: "USER_NOT_ACTIVE",
      status: 401,
    });
  }

  if (
    user.teacher &&
    (user.teacher.active === false || user.teacher.approved === false)
  ) {
    return errorResponse({
      req,
      next,
      message:
        user.teacher.approved === false
          ? "TEACHER_NOT_APPROVED"
          : "TEACHER_NOT_ACTIVE",
      status: 403,
    });
  }

  if (user.moderator && user.moderator.status !== activeStatus.ACTIVE) {
    return errorResponse({
      req,
      next,
      message: "MODERATOR_NOT_ACTIVE",
      status: 403,
    });
  }

  if (user.student && user.student.active === false) {
    return errorResponse({
      req,
      next,
      message: "STUDENT_NOT_ACTIVE",
      status: 403,
    });
  }

  if (!user || !user.password) {
    return errorResponse({
      req,
      next,
      message: "USER_NOT_FOUND_OR_UNCONFIRMED",
      status: 404,
    });
  }
  const matchedPassword = await verifyPassword({
    password,
    storedPassword: user.password,
  });
  if (!matchedPassword) {
    return errorResponse({
      req,
      next,
      message: "INVALID_CREDENTIALS",
      status: 401,
    });
  }

  const decryptedPhone = looksEncrypted(user.phone)
    ? await decryptText({ text: user.phone })
    : user.phone;
  user.phone = decryptedPhone;
  const accessToken = generateToken({ user, tokenType: "access" });
  const refreshToken = generateToken({ user, tokenType: "refresh" });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true, // يجب أن تكون true للعمل مع sameSite: 'none'
    sameSite: "none", // ضروري جداً للـ Cross-Origin
    maxAge: 60 * 60 * 24 * 30 * 1000,
    // لا تضع خاصية domain هنا، اتركها فارغة لتعمل بشكل صحيح مع النطاقات المختلفة
  });
  if (user?.role?.name && user.role.name.toLowerCase() !== "student") {
    await db.create({
      model: "auth_log",
      data: {
        userId: user.id,
        action: "login",
        role: user.role.name,
      },
    });
  }

  const permissions =
    user?.role?.rolePermissions?.map((rp) => rp.permission) || [];

  return successResponse({
    res,
    req,
    status: 200,
    message: "LOGIN_SUCCESS",
    data: {
      accessToken,
      role: user?.role?.name ? user.role.name : req.t("USER_NO_ROLE"),
      permissions,
      hasPendingSubscriptionRequest: !!subscription_request,
    },
  });
});

/* -------------------------------------------- ------------------------------ */
/*                RESEND OTP         And VERIFY ACCOUNT                         */
/* -------------------------------------------------------------------------- */

export const resendOtp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const otp = generateOtp();
  const hashedOtp = await hash({ password: otp });
  const isHaveOtp = await redis.get(`${email}_otp_register`);
  const isConfirmed = await db.findFirst({
    model: "user",
    where: { email, confirmAt: null },
  });
  if (isHaveOtp) {
    return errorResponse({
      req,
      next,
      message: "WAIT_BEFORE_NEW_OTP",
      status: 400,
    });
  }
  if (isConfirmed) {
    return errorResponse({
      req,
      next,
      message: "USER_ALREADY_CONFIRMED",
      status: 404,
    });
  }
  await redis.set(`${email}_otp_register`, hashedOtp);
  await redis.expire(`${email}_otp_register`, 60 * 10);
  await redis.set(`${email}_otp_attempts`, 0, { EX: 60 * 10 }); // Reset attempts
  const mailResult = await sendEmail({ email, otp, lang: req.lang });
  if (!mailResult.success) {
    return errorResponse({
      req,
      next,
      message: "EMAIL_SEND_FAILED",
      status: 500,
    });
  }

  return successResponse({
    res,
    req,
    status: 200,
    message: "OTP_SENT_SUCCESS",
  });
});
export const verifyAccount = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  const hasedOtp = await redis.get(`${email}_otp_register`);

  const attemptsKey = `${email}_otp_attempts`;
  const attempts = await redis.incr(attemptsKey);
  if (attempts > 5) {
    return errorResponse({
      req,
      next,
      message: "TOO_MANY_ATTEMPTS",
      status: 429,
    });
  }

  const comparedPassword = await compare({ password: otp, hash: hasedOtp });
  if (!comparedPassword) {
    return errorResponse({ req, next, message: "INVALID_OTP", status: 401 });
  }
  const matchedUser = await db.findFirst({
    model: "user",
    where: { email },
  });
  if (!matchedUser) {
    return errorResponse({ req, next, message: "USER_NOT_FOUND", status: 404 });
  }
  await redis.del(`${email}_otp_register`);
  await redis.del(`${email}_otp_attempts`);
  const user = await db.updateOne({
    model: "user",
    where: { email },
    data: { confirmAt: new Date().toISOString() },
    include: { role: true },
  });

  if (!user) {
    return errorResponse({ req, next, message: "USER_NOT_FOUND", status: 404 });
  }

  // --- Teacher provisioning (email verified → create pending teacher record) ---
  const teacherDataRaw = await redis.get(`${email}_Teacher_data`);
  if (teacherDataRaw) {
    const teacherData = JSON.parse(teacherDataRaw);

    // Create a minimal teacher record; currency/subjects are added on admin approval
    await db.create({
      model: "teacher",
      data: {
        user: { connect: { id: teacherData.user_id } },
        gender: teacherData.gender,
        active: false, // inactive until admin approves
      },
    });

    await redis.del(`${email}_Teacher_data`);

    await createAdminNotification({
      title: "طلب تسجيل مدرس جديد",
      message: `قدّم مدرس جديد طلب تسجيل بانتظار المراجعة: ${user.name} (${user.email}).`,
      type: "new_teacher",
    });

    return successResponse({
      res,
      req,
      status: 200,
      message: "USER_VERIFIED_SUCCESS",
    });
  }

  // --- Moderator provisioning (email verified → create pending moderator record) ---
  const moderatorDataRaw = await redis.get(`${email}_Moderator_data`);
  if (moderatorDataRaw) {
    const moderatorData = JSON.parse(moderatorDataRaw);

    await db.create({
      model: "moderator",
      data: {
        user: { connect: { id: moderatorData.user_id } },
        gender: moderatorData.gender || "male",
        status: "pending",
      },
    });

    await createAdminNotification({
      title: "طلب تسجيل مشرف جديد",
      message: `قدّم مشرف جديد طلب تسجيل بانتظار المراجعة: ${user.name} (${user.email}).`,
      type: "new_moderator",
    });

    return successResponse({
      res,
      req,
      status: 200,
      message: "USER_VERIFIED_SUCCESS",
    });
  }

  // --- Student provisioning ---
  if (user?.role?.name === "student") {
    await createAdminNotification({
      title: "تم تسجيل طالب جديد",
      message: `تم تسجيل طالب جديد: ${user.name} (${user.email}).`,
      type: "new_student",
    });
  }

  return successResponse({
    res,
    req,
    status: 200,
    message: "USER_VERIFIED_SUCCESS",
  });
});

export const forgetPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const checkuser = await db.findFirst({
    model: "user",
    where: { email, confirmAt: { not: null } },
  });
  if (!checkuser) {
    return errorResponse({
      req,
      next,
      message: "USER_NOT_FOUND_OR_UNCONFIRMED",
      status: 404,
    });
  }
  const otp = generateOtp();
  const hashedOtp = await hash({ password: otp });
  await redis.set(`${email}_otp_forget_password`, hashedOtp);
  await redis.expire(`${email}_otp_forget_password`, 60 * 10);
  await redis.set(`${email}_otp_forget_attempts`, 0, { EX: 60 * 10 });
  const text = req.t("RESET_PASSWORD_EMAIL_TEXT");
  const subject = req.t("RESET_PASSWORD_SUBJECT");

  const mailResult = await sendEmail({
    email,
    otp,
    subject,
    text,
    lang: req.lang,
  });
  if (!mailResult.success) {
    return errorResponse({
      req,
      next,
      message: "EMAIL_SEND_FAILED",
      status: 500,
    });
  }

  return successResponse({
    res,
    req,
    status: 201,
    message: "OTP_SENT_SUCCESS",
  });
});
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, password } = req.body;
  const checkuser = await db.findFirst({ model: "user", where: { email } });
  if (!checkuser) {
    return errorResponse({ req, next, message: "USER_NOT_FOUND", status: 404 });
  }
  const hashedOtp = await redis.get(`${email}_otp_forget_password`);

  if (!hashedOtp) {
    return errorResponse({ req, next, message: "INVALID_OTP", status: 404 });
  }

  const attemptsKey = `${email}_otp_forget_attempts`;
  const attempts = await redis.incr(attemptsKey);
  if (attempts > 5) {
    return errorResponse({
      req,
      next,
      message: "TOO_MANY_ATTEMPTS",
      status: 429,
    });
  }

  const comparedPassword = await compare({ password: otp, hash: hashedOtp });
  if (!comparedPassword) {
    return errorResponse({ req, next, message: "INVALID_OTP", status: 401 });
  }

  const encryptedPassword = encryptPassword({ password });
  const user = await db.updateOne({
    model: "user",
    where: { email },
    data: { password: encryptedPassword },
  });
  await redis.del(`${email}_otp_forget_password`);
  await redis.del(`${email}_otp_forget_attempts`);

  return successResponse({
    res,
    req,
    status: 201,
    message: "PASSWORD_RESET_SUCCESS",
  });
});

export const refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return errorResponse({
      req,
      next,
      message: "NO_REFRESH_TOKEN",
      status: 401,
    });
  }
  const verify = verifyToken({ token: refreshToken, tokenType: "refresh" });

  const user = await db.findFirst({
    model: "user",
    where: { id: verify.id, confirmAt: { not: null } },
    include: {
      teacher: true,
      student: true,
      moderator: true,
      role: true,
    },
  });
  if (!user) {
    return errorResponse({
      req,
      next,
      message: "INVALID_REFRESH_TOKEN",
      status: 401,
    });
  }

  if (user.status !== activeStatus.ACTIVE) {
    return errorResponse({
      req,
      next,
      message: "USER_NOT_ACTIVE",
      status: 401,
    });
  }

  if (
    user.teacher &&
    (user.teacher.active === false || user.teacher.approved === false)
  ) {
    return errorResponse({
      req,
      next,
      message: "TEACHER_NOT_ACTIVE",
      status: 403,
    });
  }

  if (user.moderator && user.moderator.status !== activeStatus.ACTIVE) {
    return errorResponse({
      req,
      next,
      message: "MODERATOR_NOT_ACTIVE",
      status: 403,
    });
  }

  if (user.student && user.student.active === false) {
    return errorResponse({
      req,
      next,
      message: "STUDENT_NOT_ACTIVE",
      status: 403,
    });
  }

  const accessToken = generateToken({ user, tokenType: "access" });
  const newRefreshToken = generateToken({ user, tokenType: "refresh" });

  const cookie = res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "TOKEN_REFRESH_SUCCESS",
    data: { accessToken },
  });
});

// export const googleSignUp = asyncHandler(async (req, res, next) => {
//   const { idToken } = req.body;
//   const verify = await googleVerify(idToken);
//   if (!verify) {
//     return errorResponse({ req, next, message: "INVALID_TOKEN", status: 401 });
//   }

//   if (!verify.email_verified) {
//     return errorResponse({
//       req,
//       next,
//       message: "EMAIL_NOT_VERIFIED",
//       status: 401,
//     });
//   }

//   let user = await db.findFirst({
//     model: "user",
//     where: { email: verify.email },
//   });

//   if (!user) {
//     const fullName = `${verify.given_name} ${verify.family_name}`;
//     await db.transaction(async (tx) => {
//       user = await tx.create({
//         model: "user",
//         data: {
//           name: fullName,
//           email: verify.email,
//           provider: "google",
//           googleId: verify.sub,
//           confirmAt: new Date().toISOString(),
//           status: "pending",
//         },
//       });

//       await tx.create({
//         model: "subscription_requests",
//         data: {
//           user_id: user.id,
//           planId: null,
//         },
//       });
//     });

//     await createAdminNotification({
//       title: "New Student Signed Up (Google)",
//       message: `A new student signed up via Google: ${fullName} (${verify.email}).`,
//       type: "new_student",
//     });
//   }

//   return successResponse({
//     res,
//     req,
//     status: 201,
//     message: "USER_CREATED_SUCCESS",
//     data: {},
//   });
// });
// export const googlelogin = asyncHandler(async (req, res, next) => {
//   const { idToken, provider } = req.body;
//   if (provider !== "google") {
//     return errorResponse({
//       req,
//       next,
//       message: "INVALID_PROVIDER",
//       status: 401,
//     });
//   }
//   const verify = await googleVerify(idToken);
//   if (!verify) {
//     return errorResponse({ req, next, message: "INVALID_TOKEN", status: 401 });
//   }
//   if (!verify.email_verified) {
//     return errorResponse({
//       req,
//       next,
//       message: "EMAIL_NOT_VERIFIED",
//       status: 401,
//     });
//   }

//   const user = await db.findFirst({
//     model: "user",
//     where: { googleId: verify.sub, provider: "google", email: verify.email },
//     include: {
//       role: {
//         include: {
//           rolePermissions: {
//             include: {
//               permission: true,
//             },
//           },
//         },
//       },
//     },
//   });
//   if (!user) {
//     return errorResponse({ req, next, message: "USER_NOT_FOUND", status: 404 });
//   }
//   if (user.password) {
//     return errorResponse({
//       req,
//       next,
//       message: "INVALID_CREDENTIALS",
//       status: 401,
//     });
//   }

//   const accessToken = generateToken({ user, tokenType: "access" });
//   const refreshToken = generateToken({ user, tokenType: "refresh" });

//   res.cookie("refreshToken", refreshToken, {
//     httpOnly: true,
//     secure: true,
//     sameSite: "strict",
//     maxAge: 60 * 60 * 1000,
//   });

//   if (user?.role?.name && user.role.name.toLowerCase() !== "student") {
//     await db.create({
//       model: "auth_log",
//       data: {
//         userId: user.id,
//         action: "login",
//         role: user.role.name,
//       },
//     });
//   }

//   const permissions =
//     user?.role?.rolePermissions?.map((rp) => rp.permission) || [];

//   return successResponse({
//     res,
//     req,
//     status: 200,
//     message: "LOGIN_SUCCESS",
//     data: {
//       accessToken,
//       role: user?.role?.name ? user.role.name : req.t("USER_NO_ROLE"),
//       permissions,
//     },
//   });
// });

export const logout = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    try {
      const verify = verifyToken({ token: refreshToken, tokenType: "refresh" });
      const user = await db.findFirst({
        model: "user",
        where: { id: verify.id },
        include: { role: true },
      });

      if (user?.role?.name && user.role.name.toLowerCase() !== "student") {
        await db.create({
          model: "auth_log",
          data: {
            userId: user.id,
            action: "logout",
            role: user.role.name,
          },
        });
      }
    } catch (err) {
      console.error("Logout log error:", err);
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "LOGOUT_SUCCESS",
  });
});

export const getLogs = asyncHandler(async (req, res, next) => {
  const logs = await db.findMany({
    model: "auth_log",
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  await Promise.all(logs.map((log) => decryptUserSensitiveFields(log.user)));

  return successResponse({
    res,
    req,
    data: logs,
    status: 200,
    message: "FETCH_SUCCESS",
  });
});

export const saveFCM = asyncHandler(async (req, res, next) => {
  const { fcmToken } = req.body;

  await db.updateOne({
    model: "user",
    where: { id: req.user.id },
    data: { fcmToken },
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "FCM_TOKEN_SAVED_SUCCESS",
  });
});

/* -------------------------------------------------------------------------- */
/*                       ADMIN – TEACHER SIGNUP REQUESTS                       */
/* -------------------------------------------------------------------------- */

/**
 * GET /auth/teacher-requests
 * Lists all teachers who verified their email but are not yet approved
 * (teacher.active = false and user.roleId = null).
 */
export const getTeacherRequests = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const { items: requests, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "user",
      where: {
        roleId: null,
        confirmAt: { not: null }, // email verified
        moderator: null,
      },
      page,
      limit,
      include: {
        teacher: {
          where: { active: false },
          include: {
            teacherSubjects: { include: { subject: true } },
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

  await Promise.all(requests.map((t) => decryptUserSensitiveFields(t)));

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: { requests, pagination },
  });
});

/**
 * PATCH /auth/teacher-requests/:teacherId/approve
 * Approves a pending teacher:
 *  - Assigns teacher role to user
 *  - Sets teacher.active = true
 *  - Sets user.status = "active"
 *  - Links currency + subjects (provided by admin in body)
 *  - Creates teacher wallet
 */
export const approveTeacherRequest = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { currency_id, subject_ids, meeting_link, hour_price } = req.body;

  // Find the pending teacher record
  const user = await db.findFirst({
    model: "user",
    where: { id: userId, roleId: null, confirmAt: { not: null } },
    include: { teacher: { where: { approved: false } } },
  });

  if (!user) {
    return errorResponse({
      req,
      next,
      message: "TEACHER_REQUEST_NOT_FOUND",
      status: 404,
    });
  }

  // Validate currency
  const currency = await db.findFirst({
    model: "currency",
    where: { id: currency_id },
  });
  if (!currency) {
    return errorResponse({
      req,
      next,
      message: "CURRENCY_NOT_FOUND",
      status: 404,
    });
  }

  // Validate subjects if provided
  if (subject_ids && subject_ids.length > 0) {
    const foundSubjects = await db.findMany({
      model: "subjects",
      where: { id: { in: subject_ids } },
    });
    if (foundSubjects.length !== subject_ids.length) {
      return errorResponse({
        req,
        next,
        message: "SOME_SUBJECTS_NOT_FOUND",
        status: 404,
      });
    }
  }

  // Fetch teacher role
  const teacherRole = await db.findFirst({
    model: "role",
    where: { name: "teacher" },
  });
  if (!teacherRole) {
    return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
  }

  // Atomic approval transaction
  const updatedTeacher = await db.transaction(async (tx) => {
    // Assign role + activate user
    await tx.updateOne({
      model: "user",
      where: { id: user.id },
      data: { role: { connect: { id: teacherRole.id } }, status: "active" },
    });

    // Activate teacher + link currency/subjects/meeting_link
    const approved = await tx.updateOne({
      model: "teacher",
      where: { user_id: user.id },
      data: {
        active: true,
        approved: true,
        currency: { connect: { id: currency.id } },
        ...(meeting_link && { meeting_link }),
        ...(hour_price !== undefined && { hour_price: Number(hour_price) }),
        ...(subject_ids &&
          subject_ids.length > 0 && {
            teacherSubjects: {
              create: subject_ids.map((sid) => ({
                subject: { connect: { id: sid } },
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

    // Create teacher wallet
    const existingWallet = await tx.findFirst({
      model: "Wallet",
      where: { userId: user.id, type: "teacher" },
    });
    console.log(existingWallet);
    if (!existingWallet) {
      await tx.create({
        model: "wallet",
        data: {
          type: "teacher",
          ownerId: user.id,
          balance: 0,
          currencyId: currency.id,
          userId: user.id,
        },
      });
    }

    return approved;
  });

  await decryptUserSensitiveFields(updatedTeacher.user);

  return successResponse({
    res,
    req,
    status: 200,
    message: "TEACHER_APPROVED_SUCCESS",
    data: updatedTeacher,
  });
});

/**
 * DELETE /auth/teacher-requests/:teacherId/reject
 * Rejects and removes a pending teacher signup (cascades to teacher record).
 */
export const rejectTeacherRequest = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await db.findFirst({
    model: "user",
    where: { id: userId, roleId: null, confirmAt: { not: null } },
    include: { teacher: { where: { approved: false } } },
  });

  if (!user) {
    return errorResponse({
      req,
      next,
      message: "TEACHER_REQUEST_NOT_FOUND",
      status: 404,
    });
  }

  // Deleting the user cascades to the teacher record (onDelete: Cascade in schema)
  await db.deleteOne({ model: "user", where: { id: user.id } });

  return successResponse({
    res,
    req,
    status: 200,
    message: "TEACHER_REQUEST_REJECTED",
  });
});
