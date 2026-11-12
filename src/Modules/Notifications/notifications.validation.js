import joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const getAdminNotifications = {
  query: joi.object({
    page: generalFeilds.page.optional(),
    limit: generalFeilds.limit.optional(),
    isRead: joi.boolean().optional(),
    search: generalFeilds.search.optional(),
    type: joi.string().max(32).optional(),
    category: joi.string().valid("students", "teachers", "sessions").optional(),
    notificationId: generalFeilds.id.optional(),
  }).optional(),
};

export const getUserNotifications = {
  query: joi.object({
    page: generalFeilds.page.optional(),
    limit: generalFeilds.limit.optional(),
    isRead: joi.boolean().optional(),
    search: generalFeilds.search.optional(),
    type: joi.string().max(32).optional(),
  }).optional(),
};

export const sendNotification = {
  body: joi.object({
    title: joi.string().min(3).max(100).required().messages({
      "string.empty": "TITLE_REQUIRED",
      "any.required": "TITLE_REQUIRED",
    }),
    message: joi.string().min(5).max(1000).required().messages({
      "string.empty": "DESCRIPTION_REQUIRED",
      "any.required": "DESCRIPTION_REQUIRED",
    }),
    type: joi.string().max(32).optional(),
    targetType: joi.string().valid("all", "teachers", "students", "parents", "single").required().messages({
      "any.only": "TARGET_TYPE_INVALID",
      "any.required": "TARGET_TYPE_REQUIRED",
    }),
    userId: generalFeilds.id.when("targetType", {
      is: "single",
      then: joi.required().messages({
        "any.required": "USER_ID_REQUIRED",
      }),
      otherwise: joi.optional(),
    }),
  }).required(),
};

export const markAsRead = {
  params: joi.object({
    id: generalFeilds.id.required().messages({
      "any.required": "ID_REQUIRED",
    }),
  }).required(),
};

export const deleteNotification = {
  params: joi.object({
    id: generalFeilds.id.required().messages({
      "any.required": "ID_REQUIRED",
    }),
  }).required(),
};
