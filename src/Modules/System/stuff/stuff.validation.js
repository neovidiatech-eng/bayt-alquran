import Joi from "joi";
import { generalFeilds } from "../../../Utils/GeneralFields/index.js";

export const createStuffUserSchema = {
  body: Joi.object({
    name: generalFeilds.name.required(),
    email: generalFeilds.email.required(),
    password: generalFeilds.password.required(),
    phone: generalFeilds.phone.required(),
    code_country: generalFeilds.codeCountry.required(),
    roleId: generalFeilds.id.required(),
  }),
};

export const updateStuffUserSchema = {
  body: Joi.object({
    name: generalFeilds.name.required(),
    phone: generalFeilds.phone.required(),
    code_country: generalFeilds.codeCountry.required(),
    roleId: generalFeilds.id.required(),
  }),
};

export const deleteStuffUserSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const getStuffByIdSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const getAllStuffSchema = {
  query: Joi.object({
    search: Joi.string(),
  }),
};

export const addParentSchema = {
  body: Joi.object()
    .keys({
      name: generalFeilds.name.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      codeCountry: generalFeilds.codeCountry.required(),
      country: generalFeilds.country.required(),
      phone: Joi.when("codeCountry", {
        is: "+20",
        then: Joi.string()
          .pattern(/^(?:\+20|0020|0)?1[0125][0-9]{8}$/)
          .required()
          .messages({
            "string.pattern.base": "VALID_EGYPTIAN_PHONE",
          }),
        otherwise: Joi.when("codeCountry", {
          is: "+966",
          then: Joi.string()
            .pattern(/^(?:\+966|0)?5[0-9]{8}$/)
            .required()
            .messages({
              "string.pattern.base": "VALID_SAUDI_PHONE",
            }),
          otherwise: Joi.string().required().messages({
            "string.pattern.base": "VALID_PHONE",
          }),
        }),
      }),
      timezone: Joi.string().optional(),
      students: Joi.array().items(generalFeilds.id).required(),
    })
    .required(),
};
