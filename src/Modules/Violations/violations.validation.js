import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const createInfractionItemSchema = {
  body: Joi.object({
    title_en: generalFeilds.name_en.required(),
    title_ar: generalFeilds.name_ar.required(),
    description: generalFeilds.description.optional(),
    defaultType: Joi.string().valid("warning", "penalty").default("warning"),
    defaultDeductionAmount: Joi.number().min(0).default(0),
  }),
};

export const updateInfractionItemSchema = {
  body: Joi.object({
    title_en: generalFeilds.name_en,
    title_ar: generalFeilds.name_ar,
    description: generalFeilds.description,
    defaultType: Joi.string().valid("warning", "penalty"),
    defaultDeductionAmount: Joi.number().min(0),
    active: Joi.boolean(),
  }),
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const deleteInfractionItemSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const issueTeacherViolationSchema = {
  body: Joi.object({
    teacherId: generalFeilds.id.required(),
    scheduleId: generalFeilds.id.optional(),
    infractionItemId: generalFeilds.id.optional(),
    type: Joi.string().valid("warning", "penalty").required(),
    deductionAmount: Joi.number().min(0).default(0),
    reason: Joi.string().optional(),
  }),
};

export const getAuthTeacherViolationsSchema = {
  query: Joi.object({
    type: Joi.string().valid("warning", "penalty").optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).default(10),
  }),
};

export const getTeacherViolationsSchema = {
  query: Joi.object({
    type: Joi.string().valid("warning", "penalty").optional(),
    teacherId: generalFeilds.id.optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).default(10),
  }),
};

export const issueModeratorViolationSchema = {
  body: Joi.object({
    moderatorId: generalFeilds.id.required(),
    infractionItemId: generalFeilds.id.optional(),
    type: Joi.string().valid("warning", "penalty").required(),
    deductionAmount: Joi.number().min(0).default(0),
    reason: Joi.string().optional(),
  }),
};

export const getAuthModeratorViolationsSchema = {
  query: Joi.object({
    type: Joi.string().valid("warning", "penalty").optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).default(10),
  }),
};

export const getModeratorViolationsSchema = {
  query: Joi.object({
    type: Joi.string().valid("warning", "penalty").optional(),
    moderatorId: generalFeilds.id.optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).default(10),
  }),
};

export const deleteModeratorViolationSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

