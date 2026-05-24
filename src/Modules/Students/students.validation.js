import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const createStudentSchema = {
  body: Joi.object().keys({
    name: generalFeilds.name.required(),
    email: generalFeilds.email.required(),
    password: generalFeilds.password.required(),
    phone: generalFeilds.phone.required(),
    phone_code: generalFeilds.codeCountry.required(),
    country: generalFeilds.country.required(),
    planId: generalFeilds.id
      .messages({
        "string.base": "PLAN_ID_MUST_BE_STRING",
        "string.empty": "PLAN_ID_CANNOT_BE_EMPTY",
        "string.pattern.base": "PLAN_ID_MUST_BE_VALID_ID",
        "any.required": "PLAN_ID_REQUIRED",
      })
      .required(),
    birth_date: generalFeilds.birth_date.required(),
    gender: generalFeilds.gender.required(),
    active: generalFeilds.active.required(),
    timezone: Joi.string().optional(),
  }),
};

export const updateStudentSchema = {
  params: Joi.object().keys({
    id: generalFeilds.id.required(),
  }),
  body: Joi.object()
    .keys({
      name: generalFeilds.name,
      phone: generalFeilds.phone,
      phone_code: generalFeilds.codeCountry,
      country: generalFeilds.country,
      planId: generalFeilds.id,
      birth_date: generalFeilds.birth_date,
      gender: generalFeilds.gender,
      active: generalFeilds.active,
      timezone: Joi.string().optional(),
    })
    .min(1)
    .messages({ "object.min": "VALIDATION_MIN_ONE_FIELD" }),
};

export const studentIdSchema = {
  params: Joi.object().keys({
    id: generalFeilds.id.required(),
  }),
};
