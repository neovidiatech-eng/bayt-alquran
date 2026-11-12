import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const createRankSchema = {
  body: Joi.object({
    name_ar: Joi.string().required(),
    name_en: Joi.string().required(),
    description_ar: Joi.string().optional().allow("", null),
    description_en: Joi.string().optional().allow("", null),
    color: Joi.string().optional().default("#369589"),
    icon: Joi.string().optional().allow("", null),
    minSessions: Joi.number().integer().min(0).default(0),
    minPoints: Joi.number().integer().min(0).default(0),
    active: Joi.boolean().optional().default(true),
  }),
};

export const updateRankSchema = {
  body: Joi.object({
    name_ar: Joi.string().optional(),
    name_en: Joi.string().optional(),
    description_ar: Joi.string().optional().allow("", null),
    description_en: Joi.string().optional().allow("", null),
    color: Joi.string().optional(),
    icon: Joi.string().optional().allow("", null),
    minSessions: Joi.number().integer().min(0).optional(),
    minPoints: Joi.number().integer().min(0).optional(),
    active: Joi.boolean().optional(),
  }),
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const getRankByIdSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const deleteRankSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const assignStudentRankSchema = {
  body: Joi.object({
    studentId: generalFeilds.id.required(),
    rankId: generalFeilds.id.required().allow(null),
  }),
};
