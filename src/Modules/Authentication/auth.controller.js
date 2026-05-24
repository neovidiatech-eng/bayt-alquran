import { googleVerify } from "../../Utils/GoogleClient/index.js";
import sendEmailEvent from "../../Utils/Mailer/sendEmailEvent.js";
import { redis } from "../../Utils/Radis/Connection.js";
import * as db from "../../database/dbService.js";

import {
  asyncHandler,
  successResponse,
  errorResponse,
} from "../../Utils/Response.js";
import {
  compare,
  decryptText,
  encryptText,
  hash,
  looksEncrypted,
} from "../../Utils/Security/index.js";
import { generateOtp } from "../../Utils/Security/otp.js";
import { sendEmail } from "../../Utils/Mailer/SendEmail.js";
import { generateToken, verifyToken } from "../../Utils/Token/token.js";

/* -------------------------------------------- ------------------------------ */
/*                                SIGN IN AND SIGN UP                           */
/* -------------------------------------------------------------------------- */
export const register = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    codeCountry,
    plan_id,
    birth_date,
    gender,
    country,
    timezone,
  } = req.body;

  // 1. Initial validations (Check existence outside transaction to keep it short)
  const [checkUserByEmail, checkUserByPhone] = await Promise.all([
    db.findFirst({ model: "user", where: { email } }),
    db.findFirst({ model: "user", where: { phone } }),
  ]);

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

  if (checkUserByPhone) {
    return errorResponse({ req, next, message: "PHONE_EXISTS", status: 400 });
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
  const hashedPassword = await hash({ password });
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
        password: hashedPassword,
        phone: encryptedPhone,
        code_country: codeCountry,
        timezone,
        roleId: userRole?.id ? userRole.id : null,
      },
    });

    // Store Student metadata in Redis
    await redis.set(
      `${email}_Student_data`,
      JSON.stringify({
        name,
        email,
        password: hashedPassword,
        phone: encryptedPhone,
        code_country: codeCountry,
        birth_date,
        gender,
        country,
        timezone,
        user_id: user.id,
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




export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return errorResponse({
      req,
      next,
      message: "MISSING_CREDENTIALS",
      status: 400,
    });
  }
  const user = await db.findFirst({
    model: "user",
    where: {
      email,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      subscriptionRequests: true
    },
  });

  const subscriptionRequest=user?.subscriptionRequests?.find(
    (request)=>request.status==="pending"
  )
  if(subscriptionRequest){
    return errorResponse({
      req,
      next,
      message:"USER_ALREADY_HAVE_PENDING_SUBSCRIPTION_REQUEST",
      status:400,
    });
  }

  if (!user || !user.password) {
    return errorResponse({ req, next, message: "USER_NOT_FOUND_OR_UNCONFIRMED", status: 404 });
  }
  const matchedPassword = await compare({ password, hash: user.password });
  if (!matchedPassword) {
    return errorResponse({
      req,
      next,
      message: "INVALID_CREDENTIALS",
      status: 401,
    });
  }
  if (!user.confirmAt) {
    return errorResponse({
      req,
      next,
      message: "USER_NOT_CONFIRMED",
      status: 401,
    });
  }

  const decryptedPhone = looksEncrypted(user.phone) ? await decryptText({ text: user.phone }) : user.phone;
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
      hasPendingSubscriptionRequest: !!subscriptionRequest,
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
  });

  if (!user) {
    return errorResponse({ req, next, message: "USER_NOT_FOUND", status: 404 });
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

  const mailResult = await sendEmail({ email, otp, subject, text, lang: req.lang });
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

  const hashedPassword = await hash({ password });
  const user = await db.updateOne({
    model: "user",
    where: { email },
    data: { password: hashedPassword },
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
  });
  if (!user) {
    return errorResponse({
      req,
      next,
      message: "INVALID_REFRESH_TOKEN",
      status: 401,
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

export const googleSignUp = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;
  const verify = await googleVerify(idToken);
  if (!verify) {
    return errorResponse({ req, next, message: "INVALID_TOKEN", status: 401 });
  }

  if (!verify.email_verified) {
    return errorResponse({
      req,
      next,
      message: "EMAIL_NOT_VERIFIED",
      status: 401,
    });
  }

  let user = await db.findFirst({
    model: "user",
    where: { email: verify.email },
  });

  if (!user) {
    const fullName = `${verify.given_name} ${verify.family_name}`;
    await db.transaction(async (tx) => {
      user = await tx.create({
        model: "user",
        data: {
          name: fullName,
          email: verify.email,
          provider: "google",
          googleId: verify.sub,
          confirmAt: new Date().toISOString(),
          status: "pending",
        },
      });

      await tx.create({
        model: "subscription_requests",
        data: {
          user_id: user.id,
          planId: null,
        },
      });
    });
  }

  return successResponse({
    res,
    req,
    status: 201,
    message: "USER_CREATED_SUCCESS",
    data: {},
  });
});
export const googlelogin = asyncHandler(async (req, res, next) => {
  const { idToken, provider } = req.body;
  if (provider !== "google") {
    return errorResponse({
      req,
      next,
      message: "INVALID_PROVIDER",
      status: 401,
    });
  }
  const verify = await googleVerify(idToken);
  if (!verify) {
    return errorResponse({ req, next, message: "INVALID_TOKEN", status: 401 });
  }
  if (!verify.email_verified) {
    return errorResponse({
      req,
      next,
      message: "EMAIL_NOT_VERIFIED",
      status: 401,
    });
  }

  const user = await db.findFirst({
    model: "user",
    where: { googleId: verify.sub, provider: "google", email: verify.email },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!user) {
    return errorResponse({ req, next, message: "USER_NOT_FOUND", status: 404 });
  }
  if (user.password) {
    return errorResponse({
      req,
      next,
      message: "INVALID_CREDENTIALS",
      status: 401,
    });
  }

  const accessToken = generateToken({ user, tokenType: "access" });
  const refreshToken = generateToken({ user, tokenType: "refresh" });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
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
    },
  });
});

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

  const logs=await db.findMany({
    model: "auth_log",
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return successResponse({
    res,
    req,
    data:logs,
    status: 200,
    message: "FETCH_SUCCESS",
  });
});
