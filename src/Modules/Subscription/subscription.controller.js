import { findMany } from "../../database/dbService.js";
import * as db from "../../database/dbService.js";
import { asyncHandler } from "../../Utils/Response.js";
import { decryptText, looksEncrypted } from "../../Utils/Security/index.js";

export const getallSubscriptions = asyncHandler(async (req, res, next) => {
  const subscriptions = await db.findMany({
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
    subscriptions.map(async (subscription) => {
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

  return res.status(200).json({ success: true, data: subscriptionsData });
});
