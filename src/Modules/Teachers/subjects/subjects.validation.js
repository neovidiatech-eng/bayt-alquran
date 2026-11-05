import Joi from "joi";
import { generalFeilds } from "../../../Utils/GeneralFields/index.js";

export const createSubjectSchema = {
  body: Joi.object({
    name_en: generalFeilds.name_en.required(),
    name_ar: generalFeilds.name_ar.required(),
    active: generalFeilds.active.required(),
    color: generalFeilds.color.required(),
  }),
};

export const updateSubjectSchema = {
  body: Joi.object({
    name_en: generalFeilds.name_en,
    name_ar: generalFeilds.name_ar,
    active: generalFeilds.active,
    color: generalFeilds.color,
  }),
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const deleteSubjectSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};
