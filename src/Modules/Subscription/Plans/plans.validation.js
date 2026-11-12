import Joi from "joi";
import { generalFeilds } from "../../../Utils/GeneralFields/index.js";

export const createPlanSchema = {
  body: Joi.object({
    name_en: generalFeilds.name_en.required(),
    name_ar: generalFeilds.name_ar.required(),
    description: generalFeilds.description.optional(),
    price: generalFeilds.price.required(),
    duration: generalFeilds.duration.required(),
    sessionsCount: generalFeilds.sessionsCount.required(),
    sessionTime: generalFeilds.sessionTime.required(),
    active: generalFeilds.active.required(),
    bestSeller: generalFeilds.bestSeller.required(),
    features: generalFeilds.features.optional(),
    currencyId: generalFeilds.id.required(),
    color: generalFeilds.color.optional(),
    isGroup: Joi.boolean().optional().default(false),
    maxStudents: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    planType: Joi.string().valid("individual", "group").optional().default("individual"),
  }),
};

export const updatePlanSchema = {
  body: Joi.object({
    name_en: generalFeilds.name_en,
    name_ar: generalFeilds.name_ar,
    description: generalFeilds.description,
    price: generalFeilds.price,
    duration: generalFeilds.duration,
    sessionsCount: generalFeilds.sessionsCount,
    sessionTime: generalFeilds.sessionTime,
    active: generalFeilds.active,
    bestSeller: generalFeilds.bestSeller,
    features: generalFeilds.features,
    currencyId: generalFeilds.id,
    color: generalFeilds.color.optional(),
    isGroup: Joi.boolean().optional(),
    maxStudents: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    planType: Joi.string().valid("individual", "group").optional(),
  }),
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const deletePlanSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};
