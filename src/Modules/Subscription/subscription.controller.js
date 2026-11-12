
import { findMany } from "../../database/dbService.js";
import * as db from "../../database/dbService.js";
import { asyncHandler, errorResponse, successResponse } from "../../Utils/Response.js";
import { decryptText, looksEncrypted } from "../../Utils/Security/index.js";

export const getallSubscriptions = asyncHandler(async (req, res, next) => {
  const {search}=req.query;
  const where={};
  if(search){
    where.OR=[{user:{name:{contains:search}}},{user:{email:{contains:search}}}]
  }
  const subscriptions = await db.findManyWithPaginationAndCount({
    model: "Subscription",
    include: {
      user: {
        include: {
          student: true,
        },
      },
      plan: true,
      currency: true,
    },
    });

  const subscriptionsData = await Promise.all(
    subscriptions?.items?.map(async (subscription) => {
      const phone = looksEncrypted(subscription.user.phone)
        ? await decryptText({ text: subscription.user.phone })
        : subscription.user.phone;
      return {
        id: subscription.id,
        status: subscription.status,
        amount: subscription.amount,
        currencyId: subscription.currencyId,
        startDate: subscription.startDate,
        paidAt: subscription.paidAt,
        user: {
          name: subscription.user.name,
          email: subscription.user.email,
          code_country: subscription.user.code_country,
          status: subscription.user.status,
          phone: phone,
        },
        student: subscription.user.student,
        plan: {
          id: subscription.plan.id,
          name_en: subscription.plan.name_en,
          name_ar: subscription.plan.name_ar,
          description: subscription.plan.description,
          price: subscription.plan.price,
          duration: subscription.plan.duration,
          features: subscription.plan.features,
          currencyId: subscription.plan.currencyId,
          createdAt: subscription.plan.createdAt,
          updatedAt: subscription.plan.updatedAt,
          active: subscription.plan.active,
          bestSeller: subscription.plan.bestSeller,
          sessionsCount: subscription.plan.sessionsCount,
          sessionTime: subscription.plan.sessionTime,
        },
        currency: {
          id: subscription.currency.id,
          name_en: subscription.currency.name_en,
          name_ar: subscription.currency.name_ar,
          symbol: subscription.currency.symbol,
          code: subscription.currency.code,
          default: subscription.currency.default,
          exchangeRate: subscription.currency.exchangeRate,
        },
      };
    }),
  );

  return successResponse({
    res,
    req,
    data: subscriptionsData,
    message: "SUBSCRIPTIONS_FETCHED",
    status: 200,
  });
});

export const renewSubscription = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  const { plan_id } = req.body;

  const student = await db.findOne({
    model: "student",
    where: { id: studentId },
    include: {
      user: true,
    },
  });
  if (!student) {
    return errorResponse({ req, next, status: 404, message: "STUDENT_NOT_FOUND" });
  }

    if (student?.sessions_remaining > 0) {
    return next(new Error("STUDENT_HAS_REMAINING_SESSIONS"));
  }

  const plan = await db.findOne({
    model: "Plans",
    where: { id: plan_id },
    include: {
      currency: true,
    },
  });

  if (!plan) {
    return errorResponse({ req, next, status: 404, message: "PLAN_NOT_FOUND" });
  }

  const studentSub = await db.findFirst({
    model: "subscription",
    where: { userId: student.userId },
  });

  if (!studentSub) {
    return errorResponse({ req, next, status: 404, message: "SUBSCRIPTION_NOT_FOUND" });
  }

  const { newSubscription, updatedStudent } = await db.transaction(
    async (tx) => {
      const newSubscription = await db.create({
        model: "subscription",
        data: {
          user: { connect: { id: student.user_id } },
          plan: { connect: { id: plan.id } },
          currency: { connect: { id: plan.currencyId } },
          amount: parseFloat(plan.price),
          startDate: new Date(),
          status: "active",
          paidAt: new Date(),
        },
      });
      const updatedStudent = await db.updateOne({
        model: "student",
        where: { id: studentId },
        data: {
          status: "active",
          sessions: plan.sessionsCount,
          sessions_attended: 0,
          sessions_remaining: plan.sessionsCount,
        },
      });
      const walletSystem = await db.findFirst({
        model: "wallet",
        where: { type: "system" },
      });
       const updateWalletSystem = await db.updateOne({
        model: "wallet",
        where: { id: walletSystem.id },
        data: {
          balance: { increment: parseFloat(plan.price) },
        },
      });
      const transaction = await db.create({
        model: "transaction",
        data: {
          type: "subscription",
          amount: parseFloat(plan.price),
          walletId: updateWalletSystem.id,
          type: "subscription",
          amount: parseFloat(plan.price),
          status: "completed",
          reason: {
            en: `Subscription renewed for student ${student.user.name} for plan ${plan.name_en}`,
            ar: `تم تجديد الاشتراك للطالب ${student.user.name} للاشتراك ${plan.name_ar}`,
          },
          createdAt: new Date(),
          subscriptionId: newSubscription.id,
        },
      });
     
      return { newSubscription, updatedStudent };
    },
  );
  return successResponse({
    res,
    req,
    data: { newSubscription, updatedStudent },
    message: "SUBSCRIPTION_RENEWED",
    status: 200,
  });
});
